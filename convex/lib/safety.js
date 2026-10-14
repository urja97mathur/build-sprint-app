// Safety call: Sarvam's main agent calls her own saved number. Rules shared by the server and its tests.

// The main agent's greeting, without her name: her number isn't checked, so a wrong number learns nothing about her.
export const SAFETY_OPENING = 'Hieee! Simran here. Walk pe nikle ho? Chalo, saath chalte hain!';
export const MIN_GAP_MS = 60 * 1000;
export const DAILY_CALLS = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

// The main agent's request settings (the same ones the private call test uses), or null if they're missing.
export function readSafetySetup(env) {
  if (['SARVAM_API_KEY', 'SARVAM_ORG_ID', 'SARVAM_WORKSPACE_ID', 'SARVAM_OUTBOUND_CONFIG'].some(name => !env[name]?.trim())) return null;
  try {
    const app = JSON.parse(env.SARVAM_OUTBOUND_CONFIG).app_config;
    if (!app?.app_id || !Number.isInteger(app.app_version) || !app.connection_config?.connection_id || !app.connection_config?.agent_phone_number) return null;
    return { app };
  } catch { return null; }
}

// Whether she may ask for another call now: at most one a minute and DAILY_CALLS in any 24 hours.
export function callCheck(previousCalls, now = Date.now()) {
  if (previousCalls.some(at => now - at < MIN_GAP_MS)) return 'wait';
  if (previousCalls.filter(at => now - at < DAY_MS).length >= DAILY_CALLS) return 'limit';
  return null;
}
export const CALL_PROBLEMS = {
  wait: 'Wait a minute before asking for another call.',
  limit: `You’ve reached today’s limit of ${DAILY_CALLS} calls.`,
  setup: 'Finish your safety setup first.',
  missing: 'The calling connection isn’t set up yet.',
};

// A private key for each session. Sent to Sarvam with each call, so the agent's code-word tool can say which
// session it heard the phrase on. 64 hex characters.
export function newCallKey() {
  return [...crypto.getRandomValues(new Uint8Array(32))].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

// 'requested', 'refused' (Sarvam clearly said no) or 'unconfirmed' (the phone may still ring).
// `variables` are the agent variables for this call: the session's key and her code phrase.
export async function requestSafetyCall({ env, setup, phone, variables, fetcher = fetch, timeoutMs = 10000 }) {
  const url = `https://apps.sarvam.ai/api/outbounds/v1/orgs/${encodeURIComponent(env.SARVAM_ORG_ID)}/workspaces/${encodeURIComponent(env.SARVAM_WORKSPACE_ID)}/outbounds`;
  const payload = {
    app_config: {
      ...setup.app,
      agent_variables: { ...setup.app.agent_variables, ...variables },
      app_overrides: { ...setup.app.app_overrides, initial_bot_message: SAFETY_OPENING },
    },
    user_config: { user_phone_number: phone },
  };
  try {
    const response = await fetcher(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': env.SARVAM_API_KEY },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.ok) {
      const result = await response.json().catch(() => null);
      return typeof result?.attempt_id === 'string' && result.attempt_id.trim() ? 'requested' : 'unconfirmed';
    }
    // Only the status code goes to the Convex logs: never her number or Sarvam's reply.
    console.error(`Sarvam ${response.status >= 500 ? 'could not confirm' : 'rejected'} the safety call request (${response.status}).`);
    return response.status >= 500 ? 'unconfirmed' : 'refused';
  } catch {
    // A timeout can occur after Sarvam accepted the call. Never retry automatically.
    return 'unconfirmed';
  }
}

// A position from her browser, or null if it isn't a real one.
export function cleanLocation({ latitude, longitude, accuracy, measuredAt }, now = Date.now()) {
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  if (!finite(latitude) || !finite(longitude) || !finite(accuracy) || !finite(measuredAt)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || accuracy < 0) return null;
  // The phone's clock may be a little off, but not by more than a day.
  if (Math.abs(now - measuredAt) > DAY_MS) return null;
  return { latitude, longitude, accuracy, measuredAt };
}
