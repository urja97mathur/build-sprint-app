import test from 'node:test';
import assert from 'node:assert/strict';
import { handleDemoCall, normaliseIndianMobile, indiaDay, fingerprint, FIRST_MESSAGE } from '../convex/lib/demo.js';

const env = {
  SARVAM_API_KEY: 'fake-test-key', SARVAM_ORG_ID: 'org', SARVAM_WORKSPACE_ID: 'workspace',
  DEMO_NUMBER_SECRET: 'a-demo-secret-with-at-least-32-characters',
  SARVAM_DEMO_OUTBOUND_CONFIG: JSON.stringify({ app_config: { app_id: 'demo-agent', app_version: 2, connection_config: { connection_id: 'connection', agent_phone_number: '+918888888888' } } }),
};
const post = phone => new Request('https://demo.convex.site/api/demo-call', { method: 'POST', body: JSON.stringify({ phone }) });

// A fake database that applies the same two limits as convex/demo.js.
function fakeStore() {
  const rows = new Map();
  let next = 0;
  return {
    rows,
    async reserve({ numberHash, day, dailyLimit }) {
      if ([...rows.values()].some(row => row.numberHash === numberHash)) return { ok: false, reason: 'used' };
      if ([...rows.values()].filter(row => row.day === day).length >= dailyLimit) return { ok: false, reason: 'full' };
      const id = `row-${next++}`;
      rows.set(id, { numberHash, day, status: 'reserved' });
      return { ok: true, id };
    },
    async settle({ id, outcome }) {
      if (outcome === 'refused') rows.delete(id);
      else rows.get(id).status = outcome;
    },
  };
}
const accepted = async () => Response.json({ attempt_id: 'attempt' });
const mustNotCall = () => assert.fail('must not contact Sarvam');

test('Indian mobile numbers are normalised; anything else is rejected', () => {
  for (const input of ['9876543210', '+91 98765 43210', '919876543210', '098765-43210']) assert.equal(normaliseIndianMobile(input), '+919876543210');
  for (const input of ['12345', '5876543210', '+1 415 555 0100', '', undefined]) assert.equal(normaliseIndianMobile(input), null);
});

test('the day resets at midnight India time', () => {
  assert.equal(indiaDay(Date.parse('2026-10-07T18:29:59Z')), '2026-10-07');
  assert.equal(indiaDay(Date.parse('2026-10-07T18:30:00Z')), '2026-10-08');
});

test('an invalid number is refused before any database step or call', async () => {
  const store = fakeStore();
  const result = await handleDemoCall(post('12345'), env, store, mustNotCall);
  assert.equal(result.status, 400);
  assert.equal((await result.json()).message, 'Check this phone number');
  assert.equal(store.rows.size, 0);
});

test('missing settings fail closed', async () => {
  const result = await handleDemoCall(post('9876543210'), { ...env, SARVAM_DEMO_OUTBOUND_CONFIG: '' }, fakeStore(), mustNotCall);
  assert.equal(result.status, 503);
  assert.equal((await handleDemoCall(new Request('https://x/api/demo-call'), { ...env, DEMO_NUMBER_SECRET: '' }, fakeStore())).status, 200);
});

test('limit 1: one demo call per number, ever, whatever format it is typed in', async () => {
  const store = fakeStore();
  const first = await handleDemoCall(post('9876543210'), env, store, async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.user_config.user_phone_number, '+919876543210');
    assert.equal(body.app_config.app_id, 'demo-agent');
    assert.equal(body.app_config.app_overrides.initial_bot_message, FIRST_MESSAGE);
    assert.equal(options.headers['X-API-Key'], env.SARVAM_API_KEY);
    return Response.json({ attempt_id: 'attempt' });
  });
  assert.deepEqual(await first.json(), { requested: true });
  const second = await handleDemoCall(post('+91 98765 43210'), env, store, mustNotCall);
  assert.equal(second.status, 409);
  assert.equal((await second.json()).message, 'This number already had its demo call.');
});

test('limit 2: the daily cap applies across everyone', async () => {
  const store = fakeStore();
  const capped = { ...env, DEMO_DAILY_LIMIT: '2' };
  for (const phone of ['9000000001', '9000000002']) assert.equal((await handleDemoCall(post(phone), capped, store, accepted)).status, 200);
  const third = await handleDemoCall(post('9000000003'), capped, store, mustNotCall);
  assert.equal(third.status, 429);
  assert.equal((await third.json()).message, 'Demo calls are full today. Try tomorrow.');
  assert.equal((await handleDemoCall(post('9000000004'), { ...env, DEMO_DAILY_LIMIT: '0' }, fakeStore(), mustNotCall)).status, 429);
});

test('without a setting, the daily cap is 20', async () => {
  const store = fakeStore();
  for (let i = 0; i < 20; i++) assert.equal((await handleDemoCall(post(`90000000${String(i).padStart(2, '0')}`), env, store, accepted)).status, 200);
  assert.equal((await handleDemoCall(post('9111111111'), env, store, mustNotCall)).status, 429);
});

test('a clear refusal frees the number; the code goes to the logs only', async t => {
  const logged = t.mock.method(console, 'error', () => {});
  const store = fakeStore();
  const refused = await handleDemoCall(post('9876543210'), env, store, async () => Response.json({ detail: 'secret' }, { status: 401 }));
  const body = await refused.json();
  assert.equal(refused.status, 424); // not 502: the network in front of Convex would replace the message
  assert.equal(body.message, 'Couldn’t place the call. Try again.');
  assert.doesNotMatch(JSON.stringify(body), /401|secret/);
  assert.match(logged.mock.calls[0].arguments[0], /401/);
  assert.doesNotMatch(logged.mock.calls[0].arguments[0], /9876543210|secret/);
  assert.equal(store.rows.size, 0);
  assert.equal((await handleDemoCall(post('9876543210'), env, store, accepted)).status, 200);
});

test('an unconfirmed request still uses up the number, because the phone may ring', async t => {
  t.mock.method(console, 'error', () => {});
  for (const fetcher of [async () => Response.json({}), async () => { throw new Error('timeout'); }, async () => new Response('', { status: 503 })]) {
    const store = fakeStore();
    const result = await handleDemoCall(post('9876543210'), env, store, fetcher);
    assert.equal((await result.json()).uncertain, true);
    assert.equal((await handleDemoCall(post('9876543210'), env, store, mustNotCall)).status, 409);
  }
});

test('the database never holds the phone number itself', async () => {
  const store = fakeStore();
  await handleDemoCall(post('9876543210'), env, store, accepted);
  const saved = JSON.stringify([...store.rows.values()]);
  assert.doesNotMatch(saved, /9876543210/);
  assert.match(saved, new RegExp(await fingerprint('+919876543210', env.DEMO_NUMBER_SECRET)));
});
