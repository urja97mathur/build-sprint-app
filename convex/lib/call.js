const CONFIG_NAMES = ['CALL_TEST_ACCESS_TOKEN', 'SARVAM_API_KEY', 'SARVAM_ORG_ID', 'SARVAM_WORKSPACE_ID', 'SARVAM_OUTBOUND_CONFIG', 'SARVAM_TEST_PHONE_NUMBER'];

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export function readSetup(env) {
  if (CONFIG_NAMES.some(name => !env[name]?.trim())) return null;
  if (!/^\+[1-9]\d{7,14}$/.test(env.SARVAM_TEST_PHONE_NUMBER)) return null;
  try {
    const config = JSON.parse(env.SARVAM_OUTBOUND_CONFIG);
    const app = config.app_config;
    if (!app?.app_id || !Number.isInteger(app.app_version) || !app.connection_config?.connection_id || !app.connection_config?.agent_phone_number) return null;
    // Do not accept a target number, callbacks, or agent changes from the browser.
    return { app_config: app, user_config: { user_phone_number: env.SARVAM_TEST_PHONE_NUMBER } };
  } catch { return null; }
}

export async function handleCall(request, env, fetcher = fetch, timeoutMs = 10000) {
  const expected = env.CALL_TEST_ACCESS_TOKEN;
  if (!expected || expected.length < 32 || request.headers.get('Authorization') !== `Bearer ${expected}`) {
    return json({ message: 'Open your private test link to use this demo.' }, 401);
  }
  const payload = readSetup(env);
  if (request.method === 'GET') return json({ ready: Boolean(payload) });
  if (request.method !== 'POST') return json({ message: 'This request is not supported.' }, 405);
  if (!payload) return json({ message: 'The calling connection isn’t set up yet.', uncertain: false }, 503);
  const url = `https://apps.sarvam.ai/api/outbounds/v1/orgs/${encodeURIComponent(env.SARVAM_ORG_ID)}/workspaces/${encodeURIComponent(env.SARVAM_WORKSPACE_ID)}/outbounds`;
  try {
    const response = await fetcher(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': env.SARVAM_API_KEY },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    // Raw provider responses can contain private settings: never forward or log them.
    if (!response.ok) {
      const uncertain = response.status >= 500;
      return json({
        message: uncertain ? 'We couldn’t confirm the call request.' : `Sarvam rejected the call request (${response.status}). Check the calling settings before trying again.`,
        uncertain,
      }, 502);
    }
    const result = await response.json();
    if (typeof result.attempt_id !== 'string' || !result.attempt_id.trim()) {
      return json({ message: 'We couldn’t confirm the call request.', uncertain: true }, 502);
    }
    return json({ requested: true });
  } catch {
    // A timeout can occur after Sarvam accepted the call. Never retry automatically.
    return json({ message: 'We couldn’t confirm the call request.', uncertain: true }, 504);
  }
}
