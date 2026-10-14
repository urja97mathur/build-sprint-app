import test from 'node:test';
import assert from 'node:assert/strict';
import { CHECKIN_OPENING, MAX_CHECKINS, MISSED_FOR_ALERT, afterCall, handleCallEnded, newCallId } from '../convex/lib/checkins.js';
import { SAFETY_OPENING, callReport, readSafetySetup, requestSafetyCall } from '../convex/lib/safety.js';

const KEY = 'ab'.repeat(32);
const CALL = 'cd'.repeat(16);
const report = body => new Request('https://example.test/api/call-ended', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) });
const sarvam = (status, metadata = { session_key: KEY, call_id: CALL }) => ({
  attempt_id: 'attempt', status, duration: 12, interaction_transcript: [{ role: 'user', en_text: 'Bruno ko khana diya kya' }],
  final_agent_variables: { code_phrase: 'Bruno ko khana diya kya' }, webhook_config: { url: 'https://example.test/api/call-ended', metadata },
});

test('two missed check-in calls in a row ask her contact to check on her', () => {
  assert.equal(MISSED_FOR_ALERT, 2);
  const first = afterCall({ kind: 'checkin', status: 'no_answer', missed: 0, checkInsSoFar: 1 });
  assert.deepEqual(first, { missed: 1, next: 'checkin' });
  assert.deepEqual(afterCall({ kind: 'checkin', status: 'busy', missed: first.missed, checkInsSoFar: 2 }), { missed: 2, next: 'alert' });
  assert.deepEqual(afterCall({ kind: 'checkin', status: 'not_placed', missed: 1, checkInsSoFar: 2 }), { missed: 2, next: 'alert' });
});

test('answering a check-in starts the count again; a call ending while the session is on brings a check-in', () => {
  assert.deepEqual(afterCall({ kind: 'checkin', status: 'connected', missed: 1, checkInsSoFar: 2 }), { missed: 0, next: 'checkin' });
  assert.deepEqual(afterCall({ kind: 'call', status: 'connected', missed: 0, checkInsSoFar: 0 }), { missed: 0, next: 'checkin' });
});

test('a call she asked for but didn’t answer isn’t a missed check-in: it only starts check-ins', () => {
  assert.deepEqual(afterCall({ kind: 'call', status: 'no_answer', missed: 0, checkInsSoFar: 0 }), { missed: 0, next: 'checkin' });
});

test('at most 6 check-in calls per session', () => {
  assert.equal(MAX_CHECKINS, 6);
  assert.deepEqual(afterCall({ kind: 'checkin', status: 'connected', missed: 0, checkInsSoFar: 6 }), { missed: 0, next: 'stop' });
  assert.deepEqual(afterCall({ kind: 'checkin', status: 'no_answer', missed: 1, checkInsSoFar: 6 }), { missed: 2, next: 'alert' });
});

test('Sarvam’s end-of-call report is matched by the session key and call ID it carries back', async t => {
  t.mock.method(console, 'log', () => {});
  const seen = [];
  const record = async args => { seen.push(args); return 'processed'; };
  assert.equal((await handleCallEnded(report(sarvam('connected')), record)).status, 200);
  assert.deepEqual(seen, [{ callKey: KEY, callId: CALL, status: 'connected' }]);
  assert.equal((await handleCallEnded(report(sarvam('no_answer')), async () => 'stale')).status, 200);
  assert.equal((await handleCallEnded(report(sarvam('busy')), async () => 'unknown')).status, 404);
});

test('a report without a valid key, call ID or status is refused; the logs never show the key or the transcript', async t => {
  const logged = t.mock.method(console, 'log', () => {});
  let looked = false;
  const record = async () => { looked = true; return 'processed'; };
  for (const body of [
    sarvam('connected', {}), sarvam('connected', { session_key: KEY }), sarvam('connected', { session_key: 'short', call_id: CALL }),
    sarvam('hung_up'), 'not json',
  ]) assert.equal((await handleCallEnded(report(body), record)).status, 400);
  assert.equal(looked, false);
  await handleCallEnded(report(sarvam('failed')), async () => 'processed');
  const lines = logged.mock.calls.map(c => c.arguments[0]).join('\n');
  assert.doesNotMatch(lines, new RegExp(KEY));
  assert.doesNotMatch(lines, /Bruno/);
});

test('each call asks Sarvam to report its end; a check-in call opens with Simran checking in', async () => {
  const env = {
    SARVAM_API_KEY: 'fake', SARVAM_ORG_ID: 'org', SARVAM_WORKSPACE_ID: 'ws', CONVEX_SITE_URL: 'https://site.example',
    SARVAM_OUTBOUND_CONFIG: JSON.stringify({ app_config: { app_id: 'main', app_version: 2, connection_config: { connection_id: 'c', agent_phone_number: '+918888888888' } } }),
  };
  assert.deepEqual(callReport(env, KEY, CALL), { url: 'https://site.example/api/call-ended', metadata: { session_key: KEY, call_id: CALL } });
  assert.equal(callReport({ ...env, CONVEX_SITE_URL: '' }, KEY, CALL), null);
  const bodies = [];
  const fetcher = async (_url, options) => { bodies.push(JSON.parse(options.body)); return Response.json({ attempt_id: 'a' }); };
  const setup = readSafetySetup(env);
  await requestSafetyCall({ env, setup, phone: '+919876543210', variables: {}, report: callReport(env, KEY, CALL), fetcher });
  await requestSafetyCall({ env, setup, phone: '+919876543210', variables: {}, opening: CHECKIN_OPENING, fetcher });
  assert.deepEqual(bodies[0].webhook_config, { url: 'https://site.example/api/call-ended', metadata: { session_key: KEY, call_id: CALL } });
  assert.equal(bodies[0].app_config.app_overrides.initial_bot_message, SAFETY_OPENING);
  assert.equal(bodies[1].app_config.app_overrides.initial_bot_message, CHECKIN_OPENING);
  assert.equal(bodies[1].webhook_config, undefined);
  assert.doesNotMatch(CHECKIN_OPENING, /\{|\}/);
});

test('call IDs are 32 random hex characters', () => {
  assert.match(newCallId(), /^[0-9a-f]{32}$/);
  assert.notEqual(newCallId(), newCallId());
});
