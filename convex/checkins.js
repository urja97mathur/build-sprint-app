import { v } from 'convex/values';
import { internalAction, internalMutation } from './_generated/server.js';
import { internal } from './_generated/api.js';
import { raiseCheckOnHer } from './alerts.js';
import { CALL_WINDOW_MS } from './lib/alerts.js';
import { CHECKIN_GAP_MS, CHECKIN_OPENING, MAX_CHECKINS, afterCall, newCallId } from './lib/checkins.js';
import { callReport, readSafetySetup, requestSafetyCall } from './lib/safety.js';

// Check-ins (rules in lib/checkins.js): when a call ends while her session is still on, Simran calls back a minute
// later. Two missed check-in calls in a row ask her first contact to check on her. "I'm safe" stops it all.

const checkInsOf = (ctx, sessionId) => ctx.db.query('checkIns').withIndex('by_session', q => q.eq('sessionId', sessionId)).collect();

// A call ended (Sarvam's report), or a check-in call couldn't be placed ('not_placed'). Only the session's latest
// call counts, once: a report for an older call, or a repeated report, is 'stale'.
export const callEnded = internalMutation({
  args: { callKey: v.string(), callId: v.string(), status: v.string() },
  handler: async (ctx, { callKey, callId, status }) => {
    const session = await ctx.db.query('safetySessions').withIndex('by_callKey', q => q.eq('callKey', callKey)).first();
    if (!session) return 'unknown';
    const call = session.openCall;
    if (call?.id !== callId) return 'stale';
    if (call.checkInId) {
      await ctx.db.patch(call.checkInId, { status: status === 'connected' ? 'answered' : 'missed', outcome: status, endedAt: Date.now() });
    }
    await ctx.db.patch(session._id, { openCall: undefined });
    if (session.status !== 'active') return 'processed';

    const checkInsSoFar = (await checkInsOf(ctx, session._id)).length;
    const { missed, next } = afterCall({ kind: call.kind, status, missed: session.missedCheckIns ?? 0, checkInsSoFar });
    if (next === 'checkin') {
      const checkInJob = await ctx.scheduler.runAfter(CHECKIN_GAP_MS, internal.checkins.checkIn, { sessionId: session._id });
      await ctx.db.patch(session._id, { missedCheckIns: missed, checkInJob });
    } else {
      await ctx.db.patch(session._id, { missedCheckIns: missed });
      if (next === 'alert') await raiseCheckOnHer(ctx, session);
    }
    return 'processed';
  },
});

// A check-in call: Simran calls her back. If Sarvam refuses the request, nothing will ring and no report will come,
// so it counts as a missed check-in straight away.
export const checkIn = internalAction({
  args: { sessionId: v.id('safetySessions') },
  handler: async (ctx, { sessionId }) => {
    const callId = newCallId();
    const call = await ctx.runMutation(internal.checkins.reserveCheckIn, { sessionId, callId });
    if (!call) return;
    const setup = readSafetySetup(process.env);
    const outcome = setup
      ? await requestSafetyCall({
          env: process.env,
          setup,
          phone: call.phone,
          variables: { session_key: call.callKey, code_phrase: call.phrase },
          opening: CHECKIN_OPENING,
          report: callReport(process.env, call.callKey, callId),
        })
      : 'refused';
    if (outcome === 'refused') await ctx.runMutation(internal.checkins.callEnded, { callKey: call.callKey, callId, status: 'not_placed' });
  },
});

// Records the check-in call before it's requested. Nothing happens if the session ended, another call is still
// going, or this session already had its MAX_CHECKINS check-in calls.
export const reserveCheckIn = internalMutation({
  args: { sessionId: v.id('safetySessions'), callId: v.string() },
  handler: async (ctx, { sessionId, callId }) => {
    const session = await ctx.db.get(sessionId);
    const now = Date.now();
    if (session?.status !== 'active' || !session.callKey) return null;
    if (session.openCall && now - session.openCall.requestedAt < CALL_WINDOW_MS) return null;
    if ((await checkInsOf(ctx, sessionId)).length >= MAX_CHECKINS) return null;
    const user = await ctx.db.get(session.userId);
    if (!user?.phone) return null;
    const codePhrase = await ctx.db.query('codePhrases').withIndex('by_user', q => q.eq('userId', session.userId)).first();
    const checkInId = await ctx.db.insert('checkIns', { sessionId, userId: session.userId, requestedAt: now, status: 'calling' });
    await ctx.db.patch(sessionId, { openCall: { id: callId, kind: 'checkin', checkInId, requestedAt: now }, checkInJob: undefined });
    return { phone: user.phone, phrase: codePhrase?.phrase ?? '', callKey: session.callKey };
  },
});
