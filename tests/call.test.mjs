import test from 'node:test';
import assert from 'node:assert/strict';
import { handleCall } from '../convex/lib/call.js';

const env = {
  CALL_TEST_ACCESS_TOKEN: 'a-test-token-with-at-least-32-characters',
  SARVAM_API_KEY: 'fake-test-key', SARVAM_ORG_ID: 'org', SARVAM_WORKSPACE_ID: 'workspace',
  SARVAM_TEST_PHONE_NUMBER: '+919999999999',
  SARVAM_OUTBOUND_CONFIG: JSON.stringify({ app_config: { app_id: 'agent', app_version: 1, connection_config: { connection_id: 'connection', agent_phone_number: '+918888888888' } } }),
};
const request = (method = 'POST', authorized = true) => new Request('https://demo.convex.site/api/call', {
  method, headers: authorized ? { Authorization: `Bearer ${env.CALL_TEST_ACCESS_TOKEN}` } : {},
});

test('unauthorized requests cannot trigger a call', async () => {
  const result = await handleCall(request('POST', false), env, () => assert.fail('must not contact Sarvam'));
  assert.equal(result.status, 401);
});
test('missing calling settings fail closed', async () => {
  const result = await handleCall(request(), { ...env, SARVAM_API_KEY: '' }, () => assert.fail('must not contact Sarvam'));
  assert.equal(result.status, 503);
});
test('call goes only to the server-configured number, and secrets never reach the response', async () => {
  const result = await handleCall(request(), env, async (url, options) => {
    assert.equal(url, 'https://apps.sarvam.ai/api/outbounds/v1/orgs/org/workspaces/workspace/outbounds');
    assert.equal(JSON.parse(options.body).user_config.user_phone_number, env.SARVAM_TEST_PHONE_NUMBER);
    assert.equal(options.headers['X-API-Key'], env.SARVAM_API_KEY);
    return Response.json({ attempt_id: 'private-attempt-id' });
  });
  assert.deepEqual(await result.json(), { requested: true });
});
test('provider rejection shows a plain message; the status code goes to the logs only', async t => {
  const logged = t.mock.method(console, 'error', () => {});
  const result = await handleCall(request(), env, async () => Response.json({ detail: 'secret' }, { status: 422 }));
  const body = await result.json();
  assert.equal(body.uncertain, false);
  assert.equal(body.message, 'Couldn’t place the call. Try again.');
  assert.doesNotMatch(JSON.stringify(body), /422|secret/);
  assert.equal(logged.mock.callCount(), 1);
  assert.match(logged.mock.calls[0].arguments[0], /422/);
  assert.doesNotMatch(logged.mock.calls[0].arguments[0], /secret/);
});
test('missing attempt confirmation and connection errors remain unconfirmed', async () => {
  for (const fetcher of [async () => Response.json({}), async () => { throw new Error('network failure'); }]) {
    const result = await handleCall(request(), env, fetcher);
    assert.equal((await result.json()).uncertain, true);
  }
});
