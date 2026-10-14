import test from 'node:test';
import assert from 'node:assert/strict';
import { CALL_PROBLEMS, DAILY_CALLS, SAFETY_OPENING, callCheck, cleanLocation, newCallKey, readSafetySetup, requestSafetyCall } from '../convex/lib/safety.js';

const env = {
  SARVAM_API_KEY: 'fake-test-key', SARVAM_ORG_ID: 'org', SARVAM_WORKSPACE_ID: 'workspace',
  SARVAM_OUTBOUND_CONFIG: JSON.stringify({ app_config: { app_id: 'main-agent', app_version: 3, connection_config: { connection_id: 'connection', agent_phone_number: '+918888888888' } } }),
};
const setup = readSafetySetup(env);
const PHONE = '+919876543210';
const MIN = 60 * 1000;

test('the safety call needs the main agent’s settings; anything missing means no call', () => {
  assert.equal(setup.app.app_id, 'main-agent');
  for (const name of Object.keys(env)) assert.equal(readSafetySetup({ ...env, [name]: '' }), null, name);
  assert.equal(readSafetySetup({ ...env, SARVAM_OUTBOUND_CONFIG: '{"app_config":{"app_id":"x","app_version":"3"}}' }), null);
});

test('Sarvam calls her saved number with the main agent, opening without her name', async () => {
  let sent;
  const variables = { session_key: 'a'.repeat(64), code_phrase: 'sunflower' };
  const outcome = await requestSafetyCall({ env, setup, phone: PHONE, variables, fetcher: async (url, options) => {
    sent = { url, headers: options.headers, body: JSON.parse(options.body) };
    return Response.json({ attempt_id: 'attempt' });
  } });
  assert.equal(outcome, 'requested');
  assert.match(sent.url, /\/orgs\/org\/workspaces\/workspace\/outbounds$/);
  assert.equal(sent.headers['X-API-Key'], env.SARVAM_API_KEY);
  assert.equal(sent.body.user_config.user_phone_number, PHONE);
  assert.equal(sent.body.app_config.app_id, 'main-agent');
  assert.equal(sent.body.app_config.app_overrides.initial_bot_message, SAFETY_OPENING);
  assert.doesNotMatch(SAFETY_OPENING, /user_name|\{|\}/);
  assert.deepEqual(sent.body.app_config.agent_variables, variables);
});

test('each call carries the session key and her code phrase, alongside any variables already configured', async () => {
  let body;
  const configured = readSafetySetup({ ...env, SARVAM_OUTBOUND_CONFIG: JSON.stringify({ app_config: { ...JSON.parse(env.SARVAM_OUTBOUND_CONFIG).app_config, agent_variables: { tone: 'warm' } } }) });
  await requestSafetyCall({ env, setup: configured, phone: PHONE, variables: { session_key: 'k', code_phrase: 'sunflower' }, fetcher: async (_url, options) => {
    body = JSON.parse(options.body);
    return Response.json({ attempt_id: 'attempt' });
  } });
  assert.deepEqual(body.app_config.agent_variables, { tone: 'warm', session_key: 'k', code_phrase: 'sunflower' });
});

test('session keys are 64 random hex characters', () => {
  const [a, b] = [newCallKey(), newCallKey()];
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.notEqual(a, b);
});

test('only a confirmed request counts as requested; a clear refusal is logged by status code only', async t => {
  const logged = t.mock.method(console, 'error', () => {});
  const call = fetcher => requestSafetyCall({ env, setup, phone: PHONE, fetcher });
  assert.equal(await call(async () => Response.json({})), 'unconfirmed');
  assert.equal(await call(async () => new Response('', { status: 503 })), 'unconfirmed');
  assert.equal(await call(async () => { throw new Error('timeout'); }), 'unconfirmed');
  assert.equal(await call(async () => Response.json({ detail: 'secret' }, { status: 401 })), 'refused');
  const lines = logged.mock.calls.map(c => c.arguments[0]).join('\n');
  assert.match(lines, /401/);
  assert.doesNotMatch(lines, /9876543210|secret|fake-test-key/);
});

test('call limits: one a minute, and at most 10 in any 24 hours', () => {
  const now = Date.parse('2026-10-12T12:00:00Z');
  assert.equal(callCheck([], now), null);
  assert.equal(callCheck([now - 30 * 1000], now), 'wait');
  assert.equal(callCheck([now - 2 * MIN], now), null);
  const busyDay = Array.from({ length: DAILY_CALLS }, (_, i) => now - (i + 2) * 60 * MIN);
  assert.equal(callCheck(busyDay, now), 'limit');
  assert.equal(callCheck(busyDay.map(at => at - 24 * 60 * MIN), now), null);
  assert.match(CALL_PROBLEMS.limit, /10 calls/);
});

test('only real positions from the last day are accepted', () => {
  const now = Date.parse('2026-10-12T12:00:00Z');
  const good = { latitude: 28.6139, longitude: 77.209, accuracy: 12, measuredAt: now - 5000 };
  assert.deepEqual(cleanLocation(good, now), good);
  for (const bad of [
    { ...good, latitude: 91 }, { ...good, longitude: -181 }, { ...good, accuracy: -1 },
    { ...good, latitude: NaN }, { ...good, measuredAt: now - 2 * 24 * 60 * MIN }, { ...good, longitude: '77' },
  ]) assert.equal(cleanLocation(bad, now), null);
});
