import { ConvexError, v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import { action, internalMutation, mutation, query } from './_generated/server.js';
import { internal } from './_generated/api.js';
import { CALL_PROBLEMS, callCheck, cleanLocation, newCallKey, readSafetySetup, requestSafetyCall } from './lib/safety.js';

// A safety session: "Call me" starts it (Sarvam calls her own saved number), her page shares her location,
// and "I'm safe" ends it. Ending only the phone call does not end the session.

const activeSessionOf = (ctx, userId) =>
  ctx.db.query('safetySessions').withIndex('by_user_status', q => q.eq('userId', userId).eq('status', 'active')).first();

// "Call me", and "Try again" within a session. Returns { ok, outcome } or { ok: false, message }.
export const start = action({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ message: 'Log in to continue.' });
    const setup = readSafetySetup(process.env);
    if (!setup) return { ok: false, message: CALL_PROBLEMS.missing };
    const reservation = await ctx.runMutation(internal.safety.reserveCall, { userId, newKey: newCallKey() });
    if (!reservation.ok) return { ok: false, message: CALL_PROBLEMS[reservation.reason] };
    const variables = { session_key: reservation.callKey, code_phrase: reservation.phrase };
    const outcome = await requestSafetyCall({ env: process.env, setup, phone: reservation.phone, variables });
    await ctx.runMutation(internal.safety.settleCall, { sessionId: reservation.sessionId, outcome });
    return { ok: true, outcome };
  },
});

// Checks her setup and the call limits, then opens a session (or reuses the one in progress) in one transaction.
// A new session gets `newKey` as its private call key; a session in progress keeps its own.
export const reserveCall = internalMutation({
  args: { userId: v.id('users'), newKey: v.string() },
  handler: async (ctx, { userId, newKey }) => {
    const user = await ctx.db.get(userId);
    const contact = await ctx.db.query('trustedContacts').withIndex('by_user', q => q.eq('userId', userId)).first();
    const codePhrase = await ctx.db.query('codePhrases').withIndex('by_user', q => q.eq('userId', userId)).first();
    if (!user?.phone || !user.name || !contact || !codePhrase) return { ok: false, reason: 'setup' };
    const now = Date.now();
    const recent = await ctx.db.query('safetySessions').withIndex('by_user', q => q.eq('userId', userId)).order('desc').take(20);
    const problem = callCheck(recent.flatMap(session => session.callTimes), now);
    if (problem) return { ok: false, reason: problem };
    const call = { phone: user.phone, phrase: codePhrase.phrase };
    const session = await activeSessionOf(ctx, userId);
    if (session) {
      const callKey = session.callKey ?? newKey;
      await ctx.db.patch(session._id, { callStatus: 'requesting', callTimes: [...session.callTimes, now], callKey });
      return { ok: true, sessionId: session._id, callKey, ...call };
    }
    const sessionId = await ctx.db.insert('safetySessions', { userId, status: 'active', startedAt: now, callStatus: 'requesting', callTimes: [now], callKey: newKey });
    return { ok: true, sessionId, callKey: newKey, ...call };
  },
});

export const settleCall = internalMutation({
  args: { sessionId: v.id('safetySessions'), outcome: v.union(v.literal('requested'), v.literal('unconfirmed'), v.literal('refused')) },
  handler: async (ctx, { sessionId, outcome }) => {
    await ctx.db.patch(sessionId, { callStatus: outcome });
  },
});

// The session in progress, with what Convex last received of her location, and its open alert if the code word
// was heard. Her live coordinates are never returned; an alert's location is the point her contact was sent.
export const current = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const session = await activeSessionOf(ctx, userId);
    if (!session) return null;
    const location = await ctx.db.query('sessionLocations').withIndex('by_session', q => q.eq('sessionId', session._id)).first();
    return {
      id: session._id,
      startedAt: session.startedAt,
      callStatus: session.callStatus,
      location: location ? { receivedAt: location.receivedAt, measuredAt: location.measuredAt, updates: location.updates } : null,
      alert: await openAlertOf(ctx, session),
    };
  },
});

// What the session screen shows of an alert: who it went to, whether WhatsApp accepted it, and the location sent.
async function openAlertOf(ctx, session) {
  const alert = await ctx.db.query('alerts').withIndex('by_session_status', q => q.eq('sessionId', session._id).eq('status', 'open')).order('desc').first();
  if (!alert) return null;
  const delivery = await ctx.db.query('alertDeliveries').withIndex('by_alert', q => q.eq('alertId', alert._id)).first();
  const contact = delivery
    ? await ctx.db.get(delivery.contactId)
    : await ctx.db.query('trustedContacts').withIndex('by_user', q => q.eq('userId', session.userId)).first();
  const { latitude, longitude, measuredAt } = alert.location ?? {};
  return {
    createdAt: alert.createdAt,
    contactName: contact?.name ?? null,
    delivery: delivery ? { status: delivery.status, sentAt: delivery.sentAt ?? null } : null,
    location: alert.location ? { latitude, longitude, measuredAt } : null,
  };
}

// One position from her page during the session. Only the latest is kept.
export const recordLocation = mutation({
  args: { sessionId: v.id('safetySessions'), latitude: v.number(), longitude: v.number(), accuracy: v.number(), measuredAt: v.number() },
  handler: async (ctx, { sessionId, ...position }) => {
    const userId = await getAuthUserId(ctx);
    const session = await ctx.db.get(sessionId);
    if (!userId || session?.userId !== userId) throw new ConvexError({ message: 'Log in to continue.' });
    if (session.status !== 'active') return { stopped: true };
    const now = Date.now();
    const clean = cleanLocation(position, now);
    if (!clean) throw new ConvexError({ message: 'That location couldn’t be used.' });
    const existing = await ctx.db.query('sessionLocations').withIndex('by_session', q => q.eq('sessionId', sessionId)).first();
    if (existing) await ctx.db.patch(existing._id, { ...clean, receivedAt: now, updates: existing.updates + 1 });
    else await ctx.db.insert('sessionLocations', { sessionId, userId, ...clean, receivedAt: now, updates: 1 });
    return { stopped: false };
  },
});

// "I'm safe": ends the session and location sharing, and closes its open alert as confirmed safe.
// Ending it twice is harmless.
export const end = mutation({
  args: { sessionId: v.id('safetySessions') },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    const session = await ctx.db.get(sessionId);
    if (!userId || session?.userId !== userId) throw new ConvexError({ message: 'Log in to continue.' });
    if (session.status === 'ended') return;
    const now = Date.now();
    await ctx.db.patch(sessionId, { status: 'ended', endedAt: now, safeConfirmedAt: now });
    const open = await ctx.db.query('alerts').withIndex('by_session_status', q => q.eq('sessionId', sessionId).eq('status', 'open')).collect();
    for (const alert of open) await ctx.db.patch(alert._id, { status: 'closed', safeConfirmedAt: now });
  },
});
