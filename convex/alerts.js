import { v } from 'convex/values';
import { internalAction, internalMutation } from './_generated/server.js';
import { internal } from './_generated/api.js';
import { codeWordCounts } from './lib/alerts.js';
import { alertParameters, readWhatsAppSetup, sendAlertMessage } from './lib/whatsapp.js';

// Simran heard her code phrase on a call. One open alert per session: hearing it again only counts a repeat.
// The alert keeps her latest position at that moment, if any arrived, and a new alert is sent to her contact.
export const recordCodeWord = internalMutation({
  args: { callKey: v.string() },
  handler: async (ctx, { callKey }) => {
    const session = await ctx.db.query('safetySessions').withIndex('by_callKey', q => q.eq('callKey', callKey)).first();
    if (!session) return 'unknown';
    const now = Date.now();
    if (!codeWordCounts(session, now)) return 'expired';
    const open = await ctx.db.query('alerts').withIndex('by_session_status', q => q.eq('sessionId', session._id).eq('status', 'open')).first();
    if (open) {
      await ctx.db.patch(open._id, { repeats: open.repeats + 1 });
      return 'repeat';
    }
    const latest = await ctx.db.query('sessionLocations').withIndex('by_session', q => q.eq('sessionId', session._id)).first();
    const alertId = await ctx.db.insert('alerts', {
      sessionId: session._id,
      userId: session.userId,
      reason: 'emergency',
      trigger: 'code_word',
      status: 'open',
      createdAt: now,
      repeats: 0,
      ...(latest && { location: { latitude: latest.latitude, longitude: latest.longitude, accuracy: latest.accuracy, measuredAt: latest.measuredAt } }),
    });
    await ctx.scheduler.runAfter(0, internal.alerts.sendAlert, { alertId });
    return 'recorded';
  },
});

// Sends the alert to her first trusted contact by WhatsApp, once. Scheduled actions never run twice,
// and the delivery record stops a second message for the same alert.
export const sendAlert = internalAction({
  args: { alertId: v.id('alerts') },
  handler: async (ctx, { alertId }) => {
    const delivery = await ctx.runMutation(internal.alerts.startDelivery, { alertId });
    if (!delivery) return;
    const setup = readWhatsAppSetup(process.env);
    if (!setup) {
      console.error('WhatsApp isn’t set up, so the alert wasn’t sent.');
      await ctx.runMutation(internal.alerts.settleDelivery, { deliveryId: delivery.deliveryId, outcome: 'failed', error: 'not_set_up' });
      return;
    }
    const result = await sendAlertMessage({ setup, to: delivery.to, parameters: delivery.parameters });
    await ctx.runMutation(internal.alerts.settleDelivery, { deliveryId: delivery.deliveryId, ...result });
  },
});

// Records that the alert is going to her first contact, and returns what to send. Null if there's nothing to send.
export const startDelivery = internalMutation({
  args: { alertId: v.id('alerts') },
  handler: async (ctx, { alertId }) => {
    const alert = await ctx.db.get(alertId);
    if (!alert) return null;
    if (await ctx.db.query('alertDeliveries').withIndex('by_alert', q => q.eq('alertId', alertId)).first()) return null;
    const contact = await ctx.db.query('trustedContacts').withIndex('by_user', q => q.eq('userId', alert.userId)).first();
    if (!contact) return null;
    const user = await ctx.db.get(alert.userId);
    const deliveryId = await ctx.db.insert('alertDeliveries', {
      alertId, userId: alert.userId, contactId: contact._id, channel: 'whatsapp', status: 'sending', createdAt: Date.now(),
    });
    return { deliveryId, to: contact.phone, parameters: alertParameters({ name: user?.name, alertAt: alert.createdAt, location: alert.location }) };
  },
});

export const settleDelivery = internalMutation({
  args: {
    deliveryId: v.id('alertDeliveries'),
    outcome: v.union(v.literal('sent'), v.literal('failed'), v.literal('unconfirmed')),
    messageId: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { deliveryId, outcome, messageId, error }) => {
    await ctx.db.patch(deliveryId, {
      status: outcome,
      ...(outcome === 'sent' && { sentAt: Date.now() }),
      ...(messageId && { messageId }),
      ...(error && { error }),
    });
  },
});
