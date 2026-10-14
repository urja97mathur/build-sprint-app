// Check-ins: when a call ends while her safety session is still on, Simran calls back to check on her.
// Two missed check-in calls in a row ask her first contact to check on her. Stopping alone is never an emergency.
// Sarvam reports each call's end to /api/call-ended; the database steps are in ../checkins.js.
import { CALL_KEY } from './alerts.js';

export const CHECKIN_GAP_MS = 60 * 1000;
export const MISSED_FOR_ALERT = 2;
export const MAX_CHECKINS = 6;
export const CHECKIN_OPENING = 'Hi, Simran again. Bas check kar rahi thi — sab theek hai?';
export const CALL_ID = /^[0-9a-f]{32}$/;
const SARVAM_STATUSES = ['connected', 'no_answer', 'busy', 'failed'];

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

// A fresh ID for each call request, sent with it and echoed in Sarvam's end-of-call report.
export function newCallId() {
  return [...crypto.getRandomValues(new Uint8Array(16))].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

// What happens after a call ends while the session is on. `kind` is 'call' (she asked for it) or 'checkin';
// `status` is Sarvam's outcome, or 'not_placed' when Sarvam refused the request. Only check-in calls count as
// missed: an unanswered call she asked for just starts check-ins.
export function afterCall({ kind, status, missed, checkInsSoFar }) {
  const answered = status === 'connected';
  const nowMissed = answered ? 0 : kind === 'checkin' ? missed + 1 : missed;
  if (nowMissed >= MISSED_FOR_ALERT) return { missed: nowMissed, next: 'alert' };
  if (checkInsSoFar >= MAX_CHECKINS) return { missed: nowMissed, next: 'stop' };
  return { missed: nowMissed, next: 'checkin' };
}

// Sarvam's report after a call ends. Only the session key and call ID it carries back, and the call's status,
// are read: the transcript and agent variables in the report are ignored and never stored or logged.
// `record` returns 'processed', 'stale' (already handled, or an older call) or 'unknown'.
export async function handleCallEnded(request, record) {
  let body = null;
  try { body = await request.json(); } catch {}
  const metadata = body?.webhook_config?.metadata ?? body?.metadata;
  const callKey = typeof metadata?.session_key === 'string' ? metadata.session_key : '';
  const callId = typeof metadata?.call_id === 'string' ? metadata.call_id : '';
  const status = SARVAM_STATUSES.includes(body?.status) ? body.status : null;
  if (!CALL_KEY.test(callKey) || !CALL_ID.test(callId) || !status) {
    console.log('Call report: not recognised.');
    return json({ ok: false }, 400);
  }
  const outcome = await record({ callKey, callId, status });
  console.log(`Call report: ${status}, ${outcome}.`);
  return outcome === 'unknown' ? json({ ok: false }, 404) : json({ ok: true });
}
