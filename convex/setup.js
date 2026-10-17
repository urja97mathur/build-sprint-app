import { ConvexError, v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import { mutation, query } from './_generated/server.js';
import { normalisePhone } from './lib/phone.js';
import { normaliseIndianMobile } from './lib/demo.js';
import { cleanName, cleanPhrase, MAX_CONTACTS, nextStep } from './lib/setup.js';

// Her safety setup after sign-in: name, mobile number, trusted contacts and code phrase. Nothing here sends anything.

async function requireUser(ctx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError({ message: 'Log in to continue.' });
  return userId;
}
const contactsOf = (ctx, userId) => ctx.db.query('trustedContacts').withIndex('by_user', q => q.eq('userId', userId)).collect();
const phraseOf = (ctx, userId) => ctx.db.query('codePhrases').withIndex('by_user', q => q.eq('userId', userId)).first();

// What's saved, which step is missing, and any safety session in progress. Never returns the code phrase or her number.
// `firstContact` is the name of the contact who gets her alerts, for the screens' words.
export const status = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    const user = userId && (await ctx.db.get(userId));
    if (!user) return null;
    const contactList = await contactsOf(ctx, userId);
    const contacts = contactList.length;
    const codeWordSaved = Boolean(await phraseOf(ctx, userId));
    const hasPhone = Boolean(user.phone);
    const session = await ctx.db.query('safetySessions').withIndex('by_user_status', q => q.eq('userId', userId).eq('status', 'active')).first();
    return {
      name: user.name ?? null,
      hasPhone,
      contacts,
      firstContact: contactList[0]?.name ?? null,
      codeWordSaved,
      nextStep: nextStep({ name: user.name, hasPhone, contacts, codeWordSaved }),
      activeSession: session?._id ?? null,
    };
  },
});

// Settings: her own name, email and mobile number, shown only to her.
export const account = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    const user = userId && (await ctx.db.get(userId));
    if (!user) return null;
    return { name: user.name ?? null, email: user.email ?? null, phone: user.phone ?? null };
  },
});

// Her name and mobile number. Each is saved only if the account doesn't have one yet.
export const saveProfile = mutation({
  args: { name: v.optional(v.string()), phone: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const user = await ctx.db.get(userId);
    const changes = {};
    if (args.name !== undefined && !user.name) {
      const name = cleanName(args.name);
      if (!name) throw new ConvexError({ field: 'name', message: 'Enter your name.' });
      changes.name = name;
    }
    if (args.phone !== undefined && !user.phone) {
      // Simran calls this number from an Indian number, so it must be an Indian mobile.
      const phone = normaliseIndianMobile(args.phone);
      if (!phone) throw new ConvexError({ field: 'phone', message: 'Check this phone number' });
      changes.phone = phone;
    }
    if (Object.keys(changes).length) await ctx.db.patch(userId, changes);
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
