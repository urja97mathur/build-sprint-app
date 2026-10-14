import { v } from 'convex/values';
import { internalAction, internalMutation, internalQuery } from './_generated/server.js';
import { internal } from './_generated/api.js';
import { codeWordCounts } from './lib/alerts.js';
import {
  ALERT_TEMPLATES, SAFE_UPDATE_TEMPLATE, alertParameters, readWhatsAppSetup, safeUpdateParameters, sendAlertMessage,
} from './lib/whatsapp.js';

const openAlertsOf = (ctx, sessionId) =>
  ctx.db.query('alerts').withIndex('by_session_status', q => q.eq('sessionId', sessionId).eq('status', 'open')).collect();

// An alert's messages: the alert itself (kind 'alert', or missing on older rows) and any safe update.
export const deliveriesOf = (ctx, alertId) => ctx.db.query('alertDeliveries').withIndex('by_alert', q => q.eq('alertId', alertId)).collect();
export const isAlertMessage = delivery => (delivery.kind ?? 'alert') === 'alert';

// Opens an alert for the session, with her latest position at that moment if any arrived, and sends it to her
// contact. Used by the code word (an emergency) and by missed check-ins (asking her contact to check on her).
export async function raiseAlert(ctx, session, { reason, trigger }) {
  const latest = await ctx.db.query('sessionLocations').withIndex('by_session', q => q.eq('sessionId', session._id)).first();
  const alertId = await ctx.db.insert('alerts', {
    sessionId: session._id,
    userId: session.userId,
    reason,
    trigger,
    status: 'open',
    createdAt: Date.now(),
    repeats: 0,
    ...(latest && { location: { latitude: latest.latitude, longitude: latest.longitude, accuracy: latest.accuracy, measuredAt: latest.measuredAt } }),
  });
  await ctx.scheduler.runAfter(0, internal.alerts.sendAlert, { alertId });
  return alertId;
}

// Missed check-ins: ask her contact to check on her, unless an emergency alert or a check-in alert is already open.
export async function raiseCheckOnHer(ctx, session) {
  const open = await openAlertsOf(ctx, session._id);
  if (open.length) return false;
  await raiseAlert(ctx, session, { reason: 'check_on_her', trigger: 'missed_checkins' });
  return true;
}

// Simran heard her code phrase on a call. One open emergency alert per session: hearing it again only counts a
// repeat. It's sent even if her contact was already asked to check on her.
export const recordCodeWord = internalMutation({
  args: { callKey: v.string() },
  handler: async (ctx, { callKey }) => {
    const session = await ctx.db.query('safetySessions').withIndex('by_callKey', q => q.eq('callKey', callKey)).first();
    if (!session) return 'unknown';
    if (!codeWordCounts(session, Date.now())) return 'expired';
    const open = (await openAlertsOf(ctx, session._id)).find(alert => alert.reason === 'emergency');
    if (open) {
      await ctx.db.patch(open._id, { repeats: open.repeats + 1 });
      return 'repeat';
    }
    await raiseAlert(ctx, session, { reason: 'emergency', trigger: 'code_word' });
    return 'recorded';
  },
});

// Sends the alert to her first trusted contact by WhatsApp, once, with the template for its reason. Scheduled actions never run twice,
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
    const result = await sendAlertMessage({ setup, template: ALERT_TEMPLATES[delivery.reason], to: delivery.to, parameters: delivery.parameters });
    await ctx.runMutation(internal.alerts.settleDelivery, { deliveryId: delivery.deliveryId, ...result });
  },
});

// Records that the alert is going to her first contact, and returns what to send. Null if there's nothing to send.
export const startDelivery = internalMutation({
  args: { alertId: v.id('alerts') },
  handler: async (ctx, { alertId }) => {
    const alert = await ctx.db.get(alertId);
    if (!alert) return null;
    if ((await deliveriesOf(ctx, alertId)).some(isAlertMessage)) return null;
    const contact = await ctx.db.query('trustedContacts').withIndex('by_user', q => q.eq('userId', alert.userId)).first();
    if (!contact) return null;
    const user = await ctx.db.get(alert.userId);
    const deliveryId = await ctx.db.insert('alertDeliveries', {
      alertId, userId: alert.userId, contactId: contact._id, kind: 'alert', channel: 'whatsapp', status: 'sending', createdAt: Date.now(),
    });
    return { deliveryId, reason: alert.reason, to: contact.phone, parameters: alertParameters({ name: user?.name, alertAt: alert.createdAt, location: alert.location }) };
  },
});

// "I'm safe": each contact who may have received an alert in this session (WhatsApp accepted it, it's still
// sending, or we couldn't confirm) is told she's safe, once, however many alerts they got. A contact whose alert
// clearly failed never got it, so they're not told either. Called from safety.end with the session's alerts.
export async function queueSafeUpdates(ctx, alerts) {
  const latestByContact = new Map();
  for (const alert of alerts) {
    for (const delivery of (await deliveriesOf(ctx, alert._id)).filter(isAlertMessage)) {
      if (delivery.status !== 'failed') latestByContact.set(delivery.contactId, delivery);
    }
  }
  for (const delivery of latestByContact.values()) {
    const deliveryId = await ctx.db.insert('alertDeliveries', {
      alertId: delivery.alertId, userId: delivery.userId, contactId: delivery.contactId,
      kind: 'safe_update', channel: 'whatsapp', status: 'sending', createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.alerts.sendSafeUpdate, { deliveryId });
  }
}

// Sends one safe update by WhatsApp, with her name and the time she tapped "I'm safe". Never resent automatically.
export const sendSafeUpdate = internalAction({
  args: { deliveryId: v.id('alertDeliveries') },
  handler: async (ctx, { deliveryId }) => {
    const message = await ctx.runQuery(internal.alerts.safeUpdateToSend, { deliveryId });
    if (!message) return;
    const setup = readWhatsAppSetup(process.env);
    if (!setup) {
      console.error('WhatsApp isn’t set up, so the safe update wasn’t sent.');
      await ctx.runMutation(internal.alerts.settleDelivery, { deliveryId, outcome: 'failed', error: 'not_set_up' });
      return;
    }
    const result = await sendAlertMessage({ setup, template: SAFE_UPDATE_TEMPLATE, to: message.to, parameters: message.parameters });
    await ctx.runMutation(internal.alerts.settleDelivery, { deliveryId, ...result });
  },
});

export const safeUpdateToSend = internalQuery({
  args: { deliveryId: v.id('alertDeliveries') },
  handler: async (ctx, { deliveryId }) => {
    const delivery = await ctx.db.get(deliveryId);
    if (delivery?.kind !== 'safe_update' || delivery.status !== 'sending') return null;
    const contact = await ctx.db.get(delivery.contactId);
    if (!contact) return null;
    const user = await ctx.db.get(delivery.userId);
    const alert = await ctx.db.get(delivery.alertId);
    const session = alert && await ctx.db.get(alert.sessionId);
    return { to: contact.phone, parameters: safeUpdateParameters({ name: user?.name, safeAt: session?.safeConfirmedAt ?? delivery.createdAt }) };
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
