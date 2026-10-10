import { ConvexError, v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import { mutation, query } from './_generated/server.js';
import { normalisePhone } from './lib/phone.js';
import { cleanName, cleanPhrase, MAX_CONTACTS, nextStep } from './lib/setup.js';

// Her safety setup after sign-in: name, trusted contacts and code phrase. Nothing here sends anything.

async function requireUser(ctx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError({ message: 'Log in to continue.' });
  return userId;
}
const contactsOf = (ctx, userId) => ctx.db.query('trustedContacts').withIndex('by_user', q => q.eq('userId', userId)).collect();
const phraseOf = (ctx, userId) => ctx.db.query('codePhrases').withIndex('by_user', q => q.eq('userId', userId)).first();

// What's saved and which step is missing. Never returns the code phrase itself.
export const status = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    const user = userId && (await ctx.db.get(userId));
    if (!user) return null;
    const contacts = (await contactsOf(ctx, userId)).length;
    const codeWordSaved = Boolean(await phraseOf(ctx, userId));
    return { name: user.name ?? null, contacts, codeWordSaved, nextStep: nextStep({ name: user.name, contacts, codeWordSaved }) };
  },
});

// Sets her name on a new account. An existing name is kept.
export const setName = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const userId = await requireUser(ctx);
    const clean = cleanName(name);
    if (!clean) throw new ConvexError({ field: 'name', message: 'Enter your name.' });
    const user = await ctx.db.get(userId);
    if (!user.name) await ctx.db.patch(userId, { name: clean });
  },
});

export const listContacts = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return (await contactsOf(ctx, userId)).map(contact => ({ id: contact._id, name: contact.name, phone: contact.phone }));
  },
});

export const addContact = mutation({
  args: { name: v.string(), phone: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const name = cleanName(args.name);
    if (!name) throw new ConvexError({ field: 'name', message: 'Enter their name.' });
    const phone = normalisePhone(args.phone);
    if (!phone) throw new ConvexError({ field: 'phone', message: 'Check this phone number' });
    const contacts = await contactsOf(ctx, userId);
    // A retried save, or the same number twice, keeps one contact.
    const same = contacts.find(contact => contact.phone === phone);
    if (same) return same._id;
    if (contacts.length >= MAX_CONTACTS) throw new ConvexError({ message: `You can save up to ${MAX_CONTACTS} trusted contacts.` });
    const order = contacts.length ? contacts[contacts.length - 1].order + 1 : 1;
    return ctx.db.insert('trustedContacts', { userId, name, phone, order, createdAt: Date.now() });
  },
});

// Saved once, only after a successful practice. A retry of the same phrase succeeds; a different one is refused.
export const saveCodePhrase = mutation({
  args: { phrase: v.string(), practised: v.literal(true) },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const phrase = cleanPhrase(args.phrase);
    if (!phrase) throw new ConvexError({ message: 'Choose a phrase of 3 to 60 characters.' });
    const existing = await phraseOf(ctx, userId);
    if (existing) {
      if (existing.phrase.toLowerCase() === phrase.toLowerCase()) return;
      throw new ConvexError({ message: 'Your code phrase is already saved. It can’t be changed.' });
    }
    const now = Date.now();
    await ctx.db.insert('codePhrases', { userId, phrase, practisedAt: now, savedAt: now });
  },
});
