import { ConvexError, v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import { action, internalMutation, mutation, query } from './_generated/server.js';
import { internal } from './_generated/api.js';
import { CALL_PROBLEMS, callCheck, cleanLocation, readSafetySetup, requestSafetyCall } from './lib/safety.js';

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
    const reservation = await ctx.runMutation(internal.safety.reserveCall, { userId });
    if (!reservation.ok) return { ok: false, message: CALL_PROBLEMS[reservation.reason] };
    const outcome = await requestSafetyCall({ env: process.env, setup, phone: reservation.phone });
    await ctx.runMutation(internal.safety.settleCall, { sessionId: reservation.sessionId, outcome });
    return { ok: true, outcome };
  },
});

// Checks her setup and the call limits, then opens a session (or reuses the one in progress) in one transaction.
export const reserveCall = internalMutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    const contact = await ctx.db.query('trustedContacts').withIndex('by_user', q => q.eq('userId', userId)).first();
    const phrase = await ctx.db.query('codePhrases').withIndex('by_user', q => q.eq('userId', userId)).first();
    if (!user?.phone || !user.name || !contact || !phrase) return { ok: false, reason: 'setup' };
    const now = Date.now();
    const recent = await ctx.db.query('safetySessions').withIndex('by_user', q => q.eq('userId', userId)).order('desc').take(20);
    const problem = callCheck(recent.flatMap(session => session.callTimes), now);
    if (problem) return { ok: false, reason: problem };
    const session = await activeSessionOf(ctx, userId);
    if (session) {
      await ctx.db.patch(session._id, { callStatus: 'requesting', callTimes: [...session.callTimes, now] });
      return { ok: true, sessionId: session._id, phone: user.phone };
    }
    const sessionId = await ctx.db.insert('safetySessions', { userId, status: 'active', startedAt: now, callStatus: 'requesting', callTimes: [now] });
    return { ok: true, sessionId, phone: user.phone };
  },
});

export const settleCall = internalMutation({
  args: { sessionId: v.id('safetySessions'), outcome: v.union(v.literal('requested'), v.literal('unconfirmed'), v.literal('refused')) },
  handler: async (ctx, { sessionId, outcome }) => {
    await ctx.db.patch(sessionId, { callStatus: outcome });
  },
});

// The session in progress, with what Convex last received of her location. Never returns her coordinates.
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
    };
  },
});

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

// "I'm safe": ends the session and location sharing. Ending it twice is harmless.
export const end = mutation({
  args: { sessionId: v.id('safetySessions') },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    const session = await ctx.db.get(sessionId);
    if (!userId || session?.userId !== userId) throw new ConvexError({ message: 'Log in to continue.' });
    if (session.status === 'ended') return;
    const now = Date.now();
    await ctx.db.patch(sessionId, { status: 'ended', endedAt: now, safeConfirmedAt: now });
  },
});
