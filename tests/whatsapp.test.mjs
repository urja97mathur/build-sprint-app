import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALERT_TEMPLATES, SAFE_UPDATE_TEMPLATE, alertParameters, emergencyText, indiaClock, indiaDateTime, readWhatsAppSetup, safeUpdateParameters,
  sendAlertMessage, sendEmergencyAlert,
} from '../convex/lib/whatsapp.js';

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

test('each kind of alert has its own approved template', () => {
  assert.deepEqual(ALERT_TEMPLATES, { emergency: 'emergency_alert', check_on_her: 'check_on_her' });
  assert.equal(SAFE_UPDATE_TEMPLATE, 'safe_update');
});

test('the safe update names her and when she tapped “I’m safe”, in India time', () => {
  assert.deepEqual(safeUpdateParameters({ name: ' Urja ', safeAt: at('2026-10-14T16:35:00Z') }), ['Urja', '14 Oct 2026, 10:05 pm IST']);
  assert.deepEqual(safeUpdateParameters({ name: '', safeAt: at('2026-10-14T16:35:00Z') })[0], 'a Companion user');
});

test('the alert goes to her contact with the approved template', async () => {
  let sent;
  const result = await sendAlertMessage({ setup, template: ALERT_TEMPLATES.emergency, to: CONTACT, parameters: ['Urja', 'time', 'place'], fetcher: async (url, options) => {
    sent = { url, headers: options.headers, body: JSON.parse(options.body) };
    return Response.json({ messages: [{ id: 'wamid.test', message_status: 'accepted' }] });
  } });
  assert.deepEqual(result, { outcome: 'sent', messageId: 'wamid.test' });
  assert.equal(sent.url, 'https://graph.facebook.com/v23.0/123456789012345/messages');
  assert.equal(sent.headers.Authorization, 'Bearer fake-whatsapp-token');
  assert.equal(sent.body.to, '919876543210');
  assert.equal(sent.body.template.name, 'emergency_alert');
  assert.deepEqual(sent.body.template.language, { code: 'en' });
  assert.deepEqual(sent.body.template.components[0].parameters.map(p => p.text), ['Urja', 'time', 'place']);
});

test('only an accepted message counts as sent; refusals keep WhatsApp’s error code, and the logs show no number or key', async t => {
  const logged = t.mock.method(console, 'error', () => {});
  const send = fetcher => sendAlertMessage({ setup, template: ALERT_TEMPLATES.check_on_her, to: CONTACT, parameters: ['a', 'b', 'c'], fetcher });
  assert.deepEqual(await send(async () => Response.json({ messages: [] })), { outcome: 'unconfirmed' });
  assert.deepEqual(await send(async () => Response.json({ error: { code: 131030, message: `${CONTACT} not allowed` } }, { status: 400 })), { outcome: 'failed', error: '131030' });
  assert.deepEqual(await send(async () => new Response('', { status: 401 })), { outcome: 'failed', error: '401' });
  assert.deepEqual(await send(async () => new Response('', { status: 503 })), { outcome: 'unconfirmed' });
  assert.deepEqual(await send(async () => { throw new Error('timeout'); }), { outcome: 'unconfirmed' });
  const lines = logged.mock.calls.map(c => c.arguments[0]).join('\n');
  assert.match(lines, /131030/);
  assert.doesNotMatch(lines, /9876543210|fake-whatsapp-token|not allowed/);
});

// The code word's alert: the template first; plain text only when WhatsApp can't use the template yet.
const PARAMS = ['Urja', '14 Oct 2026, 9:40 pm IST', 'https://maps.google.com/?q=28.61391,77.20902 (recorded at 9:38 pm IST)'];
const recording = replies => {
  const sent = [];
  const fetcher = async (_url, options) => { const body = JSON.parse(options.body); sent.push(body); return replies[sent.length - 1](body); };
  return { sent, fetcher };
};

test('when the template is approved, only the template goes out', async t => {
  const logged = t.mock.method(console, 'log', () => {});
  const { sent, fetcher } = recording([() => Response.json({ messages: [{ id: 'wamid.template' }] })]);
  const result = await sendEmergencyAlert({ setup, to: CONTACT, parameters: PARAMS, fetcher });
  assert.deepEqual(result, { outcome: 'sent', messageId: 'wamid.template', format: 'template' });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].type, 'template');
  assert.match(logged.mock.calls.map(c => c.arguments[0]).join('\n'), /Alert sent as template: sent/);
});

test('when the template isn’t approved (132001), the same alert goes out as plain text with the map link', async t => {
  t.mock.method(console, 'error', () => {});
  const logged = t.mock.method(console, 'log', () => {});
  const { sent, fetcher } = recording([
    () => Response.json({ error: { code: 132001, message: 'Template name does not exist in the translation' } }, { status: 404 }),
    () => Response.json({ messages: [{ id: 'wamid.text' }] }),
  ]);
  const result = await sendEmergencyAlert({ setup, to: CONTACT, parameters: PARAMS, fetcher });
  assert.deepEqual(result, { outcome: 'sent', messageId: 'wamid.text', format: 'text' });
  assert.equal(sent.length, 2);
  assert.equal(sent[1].type, 'text');
  assert.equal(sent[1].to, '919876543210');
  assert.equal(sent[1].text.preview_url, true);
  assert.equal(sent[1].text.body, emergencyText(PARAMS));
  assert.match(sent[1].text.body, /^Emergency alert from Companion\n/);
  assert.match(sent[1].text.body, /An emergency alert was triggered by Urja during her safety call\. She needs help now\./);
  assert.match(sent[1].text.body, /Last known location: https:\/\/maps\.google\.com\/\?q=28\.61391,77\.20902 \(recorded at 9:38 pm IST\)/);
  const lines = logged.mock.calls.map(c => c.arguments[0]).join('\n');
  assert.match(lines, /Alert sent as plain text \(template not available, code 132001\): sent/);
  assert.doesNotMatch(lines, /9876543210|Urja/);
});

test('a paused or disabled template also falls back; if the plain text is refused too, that’s recorded', async t => {
  t.mock.method(console, 'error', () => {});
  t.mock.method(console, 'log', () => {});
  for (const code of [132015, 132016]) {
    const { fetcher } = recording([() => Response.json({ error: { code } }, { status: 400 }), () => Response.json({ messages: [{ id: 'w' }] })]);
    assert.equal((await sendEmergencyAlert({ setup, to: CONTACT, parameters: PARAMS, fetcher })).format, 'text');
  }
  const { fetcher } = recording([
    () => Response.json({ error: { code: 132001 } }, { status: 404 }),
    () => Response.json({ error: { code: 131047 } }, { status: 400 }),
  ]);
  assert.deepEqual(await sendEmergencyAlert({ setup, to: CONTACT, parameters: PARAMS, fetcher }), { outcome: 'failed', error: '131047', format: 'text' });
});

test('other refusals (for example, a number not on the test list) don’t fall back to plain text', async t => {
  t.mock.method(console, 'error', () => {});
  t.mock.method(console, 'log', () => {});
  for (const reply of [
    () => Response.json({ error: { code: 131030 } }, { status: 400 }),
    () => new Response('', { status: 503 }),
    () => { throw new Error('timeout'); },
  ]) {
    const { sent, fetcher } = recording([reply]);
    const result = await sendEmergencyAlert({ setup, to: CONTACT, parameters: PARAMS, fetcher });
    assert.equal(result.format, 'template');
    assert.equal(sent.length, 1);
  }
});
