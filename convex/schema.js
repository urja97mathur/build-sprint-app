import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';

export default defineSchema({
  // Convex Auth's sign-in records, including `users` (name, email, email verification time).
  ...authTables,

  // Her trusted contacts, in the order she added them.
  trustedContacts: defineTable({
    userId: v.id('users'),
    name: v.string(),
    phone: v.string(), // + and country code, digits only
    order: v.number(),
    createdAt: v.number(),
  }).index('by_user', ['userId', 'order']),

  // Her code phrase. Chosen once, after a successful practice; it can't be changed in this version.
  codePhrases: defineTable({
    userId: v.id('users'),
    phrase: v.string(),
    practisedAt: v.number(),
    savedAt: v.number(),
  }).index('by_user', ['userId']),

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
