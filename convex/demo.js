import { v } from 'convex/values';
import { internalMutation } from './_generated/server.js';

// Checks both demo limits and reserves the call in one transaction, so two taps at once can't both pass.
export const reserve = internalMutation({
  args: { numberHash: v.string(), day: v.string(), dailyLimit: v.number() },
  handler: async (ctx, { numberHash, day, dailyLimit }) => {
    const used = await ctx.db.query('demoCalls').withIndex('by_numberHash', q => q.eq('numberHash', numberHash)).first();
    if (used) return { ok: false, reason: 'used' };
    const today = await ctx.db.query('demoCalls').withIndex('by_day', q => q.eq('day', day)).collect();
    if (today.length >= dailyLimit) return { ok: false, reason: 'full' };
    const id = await ctx.db.insert('demoCalls', { numberHash, day, status: 'reserved', createdAt: Date.now() });
    return { ok: true, id };
  },
});

// Records Sarvam's answer. A clear refusal placed no call, so it frees the number and the day's slot.
// An unconfirmed request keeps both, because the phone may still ring.
export const settle = internalMutation({
  args: { id: v.id('demoCalls'), outcome: v.union(v.literal('requested'), v.literal('unconfirmed'), v.literal('refused')) },
  handler: async (ctx, { id, outcome }) => {
    if (outcome === 'refused') await ctx.db.delete(id);
    else await ctx.db.patch(id, { status: outcome });
  },
});
