import test from 'node:test';
import assert from 'node:assert/strict';
import { codeWordCounts, handleCodeWord } from '../convex/lib/alerts.js';

const KEY = 'ab'.repeat(32);
const MIN = 60 * 1000;
const post = body => new Request('https://example.test/api/code-word', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) });

test('the code-word tool records an alert for the session its key names', async t => {
  t.mock.method(console, 'log', () => {});
  const seen = [];
  const record = async args => { seen.push(args); return 'recorded'; };
  const response = await handleCodeWord(post({ session_key: ` ${KEY} ` }), record);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.deepEqual(seen, [{ callKey: KEY }]);
});

test('hearing it again is accepted; an unknown or finished session is refused', async t => {
  t.mock.method(console, 'log', () => {});
  assert.equal((await handleCodeWord(post({ session_key: KEY }), async () => 'repeat')).status, 200);
  assert.equal((await handleCodeWord(post({ session_key: KEY }), async () => 'unknown')).status, 404);
  assert.equal((await handleCodeWord(post({ session_key: KEY }), async () => 'expired')).status, 404);
});

test('without a valid key nothing is looked up, and the logs never show a key', async t => {
  const logged = t.mock.method(console, 'log', () => {});
  let looked = false;
  const record = async () => { looked = true; return 'recorded'; };
  for (const body of [{}, { session_key: '' }, { session_key: 'short' }, { session_key: KEY.toUpperCase() }, { session_key: 42 }, 'not json']) {
    assert.equal((await handleCodeWord(post(body), record)).status, 400);
  }
  assert.equal(looked, false);
  await handleCodeWord(post({ session_key: KEY }), async () => 'recorded');
  assert.doesNotMatch(logged.mock.calls.map(c => c.arguments[0]).join('\n'), new RegExp(KEY));
});

test('a code word counts while the session is on, and after “I’m safe” while the last call could still be going', () => {
  const now = Date.parse('2026-10-14T12:00:00Z');
  assert.equal(codeWordCounts({ status: 'active', callTimes: [now - 5 * 60 * MIN] }, now), true);
  assert.equal(codeWordCounts({ status: 'ended', callTimes: [now - 60 * MIN, now - 10 * MIN] }, now), true);
  assert.equal(codeWordCounts({ status: 'ended', callTimes: [now - 40 * MIN] }, now), false);
});
