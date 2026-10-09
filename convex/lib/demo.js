// Demo call before sign-up: one per phone number, ever, and a daily cap across everyone.
// The limits are enforced in the database (../demo.js); this file talks to the browser and Sarvam.
// The 60-second cap is the demo agent's "Max call length" setting in Sarvam.

export const FIRST_MESSAGE = 'Hi, this is the demo call you asked for from the companion app. I’m Simran, an AI, not a real person. Meri awaaz clear aa rahi hai?';
const DEFAULT_DAILY_LIMIT = 20;
const CONFIG_NAMES = ['SARVAM_API_KEY', 'SARVAM_ORG_ID', 'SARVAM_WORKSPACE_ID', 'SARVAM_DEMO_OUTBOUND_CONFIG', 'DEMO_NUMBER_SECRET'];

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

// Indian mobile numbers only: 10 digits starting 6–9, with or without +91, 91 or 0 in front.
export function normaliseIndianMobile(input) {
  const match = /^(?:\+91|91|0)?([6-9]\d{9})$/.exec(String(input ?? '').replace(/[\s()-]/g, ''));
  return match ? `+91${match[1]}` : null;
}

export function readDemoSetup(env) {
  if (CONFIG_NAMES.some(name => !env[name]?.trim())) return null;
  if (env.DEMO_NUMBER_SECRET.length < 32) return null;
  const limitText = env.DEMO_DAILY_LIMIT?.trim();
  const dailyLimit = limitText ? Number(limitText) : DEFAULT_DAILY_LIMIT;
  if (!Number.isInteger(dailyLimit) || dailyLimit < 0) return null;
  try {
    const app = JSON.parse(env.SARVAM_DEMO_OUTBOUND_CONFIG).app_config;
    if (!app?.app_id || !Number.isInteger(app.app_version) || !app.connection_config?.connection_id || !app.connection_config?.agent_phone_number) return null;
    return { app, dailyLimit };
  } catch { return null; }
}

// The day the daily cap counts against, in India time (UTC+5:30), so it resets at midnight IST.
export function indiaDay(now = Date.now()) {
  return new Date(now + 330 * 60 * 1000).toISOString().slice(0, 10);
}

// A keyed fingerprint lets the database recognise a number without storing it.
export async function fingerprint(number, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(number));
  return [...new Uint8Array(signature)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

// `store` holds the two database steps: reserve (checks both limits) and settle (records the outcome).
export async function handleDemoCall(request, env, store, fetcher = fetch, timeoutMs = 10000) {
  const setup = readDemoSetup(env);
  if (request.method === 'GET') return json({ ready: Boolean(setup) });
  if (request.method !== 'POST') return json({ message: 'This request is not supported.' }, 405);
  if (!setup) return json({ message: 'The calling connection isn’t set up yet. Your phone won’t ring until it’s connected.', uncertain: false }, 503);

  let body = null;
  try { body = await request.json(); } catch {}
  const number = normaliseIndianMobile(body?.phone);
  if (!number) return json({ message: 'Check this phone number', uncertain: false }, 400);

  const reservation = await store.reserve({
    numberHash: await fingerprint(number, env.DEMO_NUMBER_SECRET),
    day: indiaDay(),
    dailyLimit: setup.dailyLimit,
  });
  if (!reservation.ok) {
    return reservation.reason === 'used'
      ? json({ message: 'This number already had its demo call.', uncertain: false }, 409)
      : json({ message: 'Demo calls are full today. Try tomorrow.', uncertain: false }, 429);
  }

  const payload = {
    app_config: { ...setup.app, app_overrides: { ...setup.app.app_overrides, initial_bot_message: FIRST_MESSAGE } },
    user_config: { user_phone_number: number },
  };
  const url = `https://apps.sarvam.ai/api/outbounds/v1/orgs/${encodeURIComponent(env.SARVAM_ORG_ID)}/workspaces/${encodeURIComponent(env.SARVAM_WORKSPACE_ID)}/outbounds`;
  let outcome;
  try {
    const response = await fetcher(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': env.SARVAM_API_KEY },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.ok) {
      const result = await response.json().catch(() => null);
      outcome = typeof result?.attempt_id === 'string' && result.attempt_id.trim() ? 'requested' : 'unconfirmed';
    } else {
      outcome = response.status >= 500 ? 'unconfirmed' : 'refused';
      // Only the status code goes to the Convex logs: never the number or Sarvam's reply.
      console.error(`Sarvam ${outcome === 'refused' ? 'rejected' : 'could not confirm'} the demo call request (${response.status}).`);
    }
  } catch {
    // A timeout can occur after Sarvam accepted the call. Never retry automatically.
    outcome = 'unconfirmed';
  }
  await store.settle({ id: reservation.id, outcome });

  // 424, not 502/504: the network in front of Convex replaces 502/504 replies with its own error page,
  // and the browser would never see the message.
  if (outcome === 'requested') return json({ requested: true });
  if (outcome === 'refused') return json({ message: 'Couldn’t place the call. Try again.', uncertain: false }, 424);
  return json({ message: 'We couldn’t confirm the call request.', uncertain: true }, 424);
}
