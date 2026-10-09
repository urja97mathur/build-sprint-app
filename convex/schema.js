import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // Demo calls before sign-up. Phone numbers are stored only as a keyed fingerprint, never as numbers.
  demoCalls: defineTable({
    numberHash: v.string(),
    day: v.string(), // India date the call counts against, YYYY-MM-DD
    status: v.union(v.literal('reserved'), v.literal('requested'), v.literal('unconfirmed')),
    createdAt: v.number(),
  })
    .index('by_numberHash', ['numberHash'])
    .index('by_day', ['day']),
});
