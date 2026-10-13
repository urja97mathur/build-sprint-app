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

  // A safety session: from "Call me" until she taps "I'm safe". Each call request's time is kept for the limits.
  safetySessions: defineTable({
    userId: v.id('users'),
    status: v.union(v.literal('active'), v.literal('ended')),
    startedAt: v.number(),
    callStatus: v.union(v.literal('requesting'), v.literal('requested'), v.literal('unconfirmed'), v.literal('refused')),
    callTimes: v.array(v.number()),
    endedAt: v.optional(v.number()),
    safeConfirmedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId', 'startedAt'])
    .index('by_user_status', ['userId', 'status']),

  // Her latest position during a session (one row per session, replaced on each update), and how many arrived.
  sessionLocations: defineTable({
    sessionId: v.id('safetySessions'),
    userId: v.id('users'),
    latitude: v.number(),
    longitude: v.number(),
    accuracy: v.number(), // metres
    measuredAt: v.number(), // when her phone measured it
    receivedAt: v.number(), // when Convex received it
    updates: v.number(),
  }).index('by_session', ['sessionId']),

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
