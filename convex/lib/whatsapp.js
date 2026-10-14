// WhatsApp alert messages, through Meta's WhatsApp Cloud API, using templates approved in WhatsApp Manager.
// Both take the same three blanks: her name, the alert time, and her last known location.
//   emergency_alert: "An emergency alert was triggered by {{1}} during her safety call. She needs help now. …"
//   check_on_her:    "{{1}} started a safety call and isn't answering check-in calls. Please check on her. …"
// After "I'm safe", contacts who got an alert are told, with her name and the time she marked herself safe:
//   safe_update:     "{{1}} marked herself safe at {{2}}. Location sharing has ended. …"
import { indiaDay } from './demo.js';

export const GRAPH = 'https://graph.facebook.com/v23.0';
export const ALERT_TEMPLATES = { emergency: 'emergency_alert', check_on_her: 'check_on_her' };
export const SAFE_UPDATE_TEMPLATE = 'safe_update';
const LANGUAGE = 'en';
const IST_MS = 330 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// The sending settings, or null if they're missing. The Phone number ID is Meta's ID, not the phone number.
export function readWhatsAppSetup(env) {
  const token = env.WHATSAPP_TOKEN?.trim();
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!token || !/^\d+$/.test(phoneNumberId ?? '')) return null;
  return { token, phoneNumberId };
}

// "9:40 pm IST" and "14 Oct 2026, 9:40 pm IST". Her contacts are in India, so times are in India time.
export function indiaClock(ms) {
  const d = new Date(ms + IST_MS);
  const hour = d.getUTCHours();
  return `${hour % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, '0')} ${hour < 12 ? 'am' : 'pm'} IST`;
}
export function indiaDateTime(ms) {
  const d = new Date(ms + IST_MS);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${indiaClock(ms)}`;
}

const nameOf = name => String(name ?? '').replace(/\s+/g, ' ').trim() || 'a Companion user';

// The safe update's two blanks: her name and when she tapped "I'm safe".
export function safeUpdateParameters({ name, safeAt }) {
  return [nameOf(name), indiaDateTime(safeAt)];
}

// The template's three blanks: her name, the alert time, and her last known location with the time it was
// recorded (its date too, if that was another day), or "unavailable".
export function alertParameters({ name, alertAt, location }) {
  const who = nameOf(name);
  if (!location) return [who, indiaDateTime(alertAt), 'unavailable'];
  const recorded = indiaDay(location.measuredAt) === indiaDay(alertAt) ? indiaClock(location.measuredAt) : indiaDateTime(location.measuredAt);
  const link = `https://maps.google.com/?q=${location.latitude.toFixed(5)},${location.longitude.toFixed(5)}`;
  return [who, indiaDateTime(alertAt), `${link} (recorded at ${recorded})`];
}

// WhatsApp's error codes for a template it can't use: not approved (or not found), paused, or disabled.
export const TEMPLATE_UNAVAILABLE = new Set(['132001', '132015', '132016']);

// The emergency alert as plain text: the same words as the `emergency_alert` template, header included.
export function emergencyText([who, alertTime, location]) {
  return [
    'Emergency alert from Companion',
    '',
    'Hey!',
    `An emergency alert was triggered by ${who} during her safety call. She needs help now.`,
    '',
    `Alert time: ${alertTime}`,
    `Last known location: ${location}`,
    '',
    'Sent automatically by the Companion app.',
  ].join('\n');
}

// { outcome: 'sent', messageId } when WhatsApp accepted the message (not proof it was delivered),
// { outcome: 'failed', error } when WhatsApp clearly refused, or { outcome: 'unconfirmed' } when we can't tell.
// The logs get the status and WhatsApp's error code only: never the number or the message.
export function sendAlertMessage({ setup, template, to, parameters, fetcher, timeoutMs }) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to.replace(/^\+/, ''),
    type: 'template',
    template: {
      name: template,
      language: { code: LANGUAGE },
      components: [{ type: 'body', parameters: parameters.map(text => ({ type: 'text', text })) }],
    },
  };
  return postMessage({ setup, payload, fetcher, timeoutMs });
}

// A plain-text message. WhatsApp only delivers it if the person messaged this business number in the last
// 24 hours; otherwise it may accept it and then drop it, which this app can't see without webhooks.
export function sendTextMessage({ setup, to, text, fetcher, timeoutMs }) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to.replace(/^\+/, ''),
    type: 'text',
    text: { preview_url: true, body: text },
  };
  return postMessage({ setup, payload, fetcher, timeoutMs });
}

// The code word's alert: the `emergency_alert` template, or, if WhatsApp can't use the template yet (for example,
// not approved), the same alert as plain text. `format` says which one went out, and the logs say so too.
export async function sendEmergencyAlert({ setup, to, parameters, fetcher, timeoutMs }) {
  const result = await sendAlertMessage({ setup, template: ALERT_TEMPLATES.emergency, to, parameters, fetcher, timeoutMs });
  if (result.outcome !== 'failed' || !TEMPLATE_UNAVAILABLE.has(result.error)) {
    console.log(`Alert sent as template: ${result.outcome}.`);
    return { ...result, format: 'template' };
  }
  const text = await sendTextMessage({ setup, to, text: emergencyText(parameters), fetcher, timeoutMs });
  console.log(`Alert sent as plain text (template not available, code ${result.error}): ${text.outcome}.`);
  return { ...text, format: 'text' };
}

async function postMessage({ setup, payload, fetcher = fetch, timeoutMs = 10000 }) {
  try {
    const response = await fetcher(`${GRAPH}/${setup.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${setup.token}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const result = await response.json().catch(() => null);
    if (response.ok) {
      const messageId = result?.messages?.[0]?.id;
      return typeof messageId === 'string' && messageId ? { outcome: 'sent', messageId } : { outcome: 'unconfirmed' };
    }
    const code = Number.isInteger(result?.error?.code) ? String(result.error.code) : null;
    console.error(`WhatsApp ${response.status >= 500 ? 'could not confirm' : 'refused'} the ${payload.type} message (${response.status}${code ? `, code ${code}` : ''}).`);
    if (response.status >= 500) return { outcome: 'unconfirmed', ...(code && { error: code }) };
    return { outcome: 'failed', error: code ?? String(response.status) };
  } catch {
    // A timeout can happen after WhatsApp accepted it. Never resend automatically: she'd risk a duplicate alert.
    return { outcome: 'unconfirmed' };
  }
}
