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
    // Private key sent to Sarvam with each call; its code-word tool sends it back. Never sent to the page.
    callKey: v.optional(v.string()),
    // The call whose end Sarvam hasn't reported yet: one she asked for, or a check-in call.
    openCall: v.optional(v.object({
      id: v.string(),
      kind: v.union(v.literal('call'), v.literal('checkin')),
      checkInId: v.optional(v.id('checkIns')),
      requestedAt: v.number(),
    })),
    missedCheckIns: v.optional(v.number()), // check-in calls missed in a row
    checkInJob: v.optional(v.id('_scheduled_functions')), // the next check-in call, if one is waiting
  })
    .index('by_user', ['userId', 'startedAt'])
    .index('by_user_status', ['userId', 'status'])
    .index('by_callKey', ['callKey']),

  // Check-in calls: Simran calling back after a call ended while the session was still on.
  checkIns: defineTable({
    sessionId: v.id('safetySessions'),
    userId: v.id('users'),
    requestedAt: v.number(),
    status: v.union(v.literal('calling'), v.literal('answered'), v.literal('missed')),
    outcome: v.optional(v.string()), // Sarvam's: connected, no_answer, busy, failed; or not_placed
    endedAt: v.optional(v.number()),
  }).index('by_session', ['sessionId', 'requestedAt']),

  // An alert during a session: an emergency (her code word) or a request to check on her (missed check-ins).
  // At most one open alert of each reason per session; hearing the code word again only counts a repeat.
  // `location` is her latest position when the alert was raised, if any had arrived.
  alerts: defineTable({
    sessionId: v.id('safetySessions'),
    userId: v.id('users'),
    reason: v.union(v.literal('emergency'), v.literal('check_on_her')),
    trigger: v.union(v.literal('code_word'), v.literal('missed_checkins')),
    status: v.union(v.literal('open'), v.literal('closed')),
    createdAt: v.number(),
    repeats: v.number(), // the code word heard again while this alert was open
    location: v.optional(v.object({ latitude: v.number(), longitude: v.number(), accuracy: v.number(), measuredAt: v.number() })),
    safeConfirmedAt: v.optional(v.number()), // she tapped "I'm safe" afterwards
  }).index('by_session_status', ['sessionId', 'status']),

  // Each message to a contact about an alert: the alert itself, or (after "I'm safe") the update that she's safe,
  // one per contact. 'sent' means WhatsApp accepted the message: not that it was delivered or read.
  // 'unconfirmed' means we couldn't tell (for example, a timeout).
  alertDeliveries: defineTable({
    alertId: v.id('alerts'),
    userId: v.id('users'),
    contactId: v.id('trustedContacts'),
    kind: v.optional(v.union(v.literal('alert'), v.literal('safe_update'))), // missing means 'alert'
    channel: v.literal('whatsapp'),
    status: v.union(v.literal('sending'), v.literal('sent'), v.literal('failed'), v.literal('unconfirmed')),
    createdAt: v.number(),
    sentAt: v.optional(v.number()), // when WhatsApp accepted it
    messageId: v.optional(v.string()), // WhatsApp's ID, for its delivery reports later
    error: v.optional(v.string()), // WhatsApp's error code, or 'not_set_up'
  }).index('by_alert', ['alertId']),

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
