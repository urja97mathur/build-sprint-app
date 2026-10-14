import test from 'node:test';
import assert from 'node:assert/strict';
import { ALERT_TEMPLATE, alertParameters, indiaClock, indiaDateTime, readWhatsAppSetup, sendAlertMessage } from '../convex/lib/whatsapp.js';

const env = { WHATSAPP_TOKEN: 'fake-whatsapp-token', WHATSAPP_PHONE_NUMBER_ID: '123456789012345' };
const setup = readWhatsAppSetup(env);
const CONTACT = '+919876543210';
const at = iso => Date.parse(iso);

test('sending needs the key and a Phone number ID made of digits', () => {
  assert.deepEqual(setup, { token: 'fake-whatsapp-token', phoneNumberId: '123456789012345' });
  assert.equal(readWhatsAppSetup({ ...env, WHATSAPP_TOKEN: '' }), null);
  assert.equal(readWhatsAppSetup({ ...env, WHATSAPP_PHONE_NUMBER_ID: '' }), null);
  assert.equal(readWhatsAppSetup({ ...env, WHATSAPP_PHONE_NUMBER_ID: '+15551234567' }), null);
});

test('times are written in India time, with am and pm', () => {
  assert.equal(indiaDateTime(at('2026-10-14T16:10:00Z')), '14 Oct 2026, 9:40 pm IST');
  assert.equal(indiaDateTime(at('2026-10-14T18:30:00Z')), '15 Oct 2026, 12:00 am IST');
  assert.equal(indiaClock(at('2026-10-14T06:35:00Z')), '12:05 pm IST');
});

test('the message names her, the alert time, and her last known location with when it was recorded', () => {
  const alertAt = at('2026-10-14T16:10:00Z');
  const location = { latitude: 28.613912, longitude: 77.209021, accuracy: 20, measuredAt: at('2026-10-14T16:08:00Z') };
  assert.deepEqual(alertParameters({ name: ' Urja \n Mathur ', alertAt, location }), [
    'Urja Mathur', '14 Oct 2026, 9:40 pm IST', 'https://maps.google.com/?q=28.61391,77.20902 (recorded at 9:38 pm IST)',
  ]);
  const yesterday = { ...location, measuredAt: at('2026-10-13T18:20:00Z') };
  assert.match(alertParameters({ name: 'Urja', alertAt, location: yesterday })[2], /\(recorded at 13 Oct 2026, 11:50 pm IST\)$/);
  assert.deepEqual(alertParameters({ name: 'Urja', alertAt }), ['Urja', '14 Oct 2026, 9:40 pm IST', 'unavailable']);
});

test('the alert goes to her contact with the approved template', async () => {
  let sent;
  const result = await sendAlertMessage({ setup, to: CONTACT, parameters: ['Urja', 'time', 'place'], fetcher: async (url, options) => {
    sent = { url, headers: options.headers, body: JSON.parse(options.body) };
    return Response.json({ messages: [{ id: 'wamid.test', message_status: 'accepted' }] });
  } });
  assert.deepEqual(result, { outcome: 'sent', messageId: 'wamid.test' });
  assert.equal(sent.url, 'https://graph.facebook.com/v23.0/123456789012345/messages');
  assert.equal(sent.headers.Authorization, 'Bearer fake-whatsapp-token');
  assert.equal(sent.body.to, '919876543210');
  assert.equal(sent.body.template.name, ALERT_TEMPLATE.name);
  assert.deepEqual(sent.body.template.language, { code: 'en' });
  assert.deepEqual(sent.body.template.components[0].parameters.map(p => p.text), ['Urja', 'time', 'place']);
});

test('only an accepted message counts as sent; refusals keep WhatsApp’s error code, and the logs show no number or key', async t => {
  const logged = t.mock.method(console, 'error', () => {});
  const send = fetcher => sendAlertMessage({ setup, to: CONTACT, parameters: ['a', 'b', 'c'], fetcher });
  assert.deepEqual(await send(async () => Response.json({ messages: [] })), { outcome: 'unconfirmed' });
  assert.deepEqual(await send(async () => Response.json({ error: { code: 131030, message: `${CONTACT} not allowed` } }, { status: 400 })), { outcome: 'failed', error: '131030' });
  assert.deepEqual(await send(async () => new Response('', { status: 401 })), { outcome: 'failed', error: '401' });
  assert.deepEqual(await send(async () => new Response('', { status: 503 })), { outcome: 'unconfirmed' });
  assert.deepEqual(await send(async () => { throw new Error('timeout'); }), { outcome: 'unconfirmed' });
  const lines = logged.mock.calls.map(c => c.arguments[0]).join('\n');
  assert.match(lines, /131030/);
  assert.doesNotMatch(lines, /9876543210|fake-whatsapp-token|not allowed/);
});
