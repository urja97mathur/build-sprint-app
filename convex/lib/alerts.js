// Code word on a call: when Sarvam's main agent hears her phrase, it calls our API tool (`code_word_heard`)
// with the session's private key. The database step (../alerts.js) records the alert. Nothing is sent yet.

export const CALL_KEY = /^[0-9a-f]{64}$/;
// How long her last call could still be going: the main agent's 30-minute limit, plus ringing.
const CALL_WINDOW_MS = 35 * 60 * 1000;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

// Whether a code word heard on this session's call counts: always while the session is on, and after
// "I'm safe" for as long as her last call could still be going. A code word on a live call is never ignored.
export function codeWordCounts(session, now = Date.now()) {
  return session.status === 'active' || now - Math.max(...session.callTimes) < CALL_WINDOW_MS;
}

// `record` is the database step: it returns 'recorded', 'repeat', 'unknown' or 'expired'.
// The logs get only the outcome, never the key.
export async function handleCodeWord(request, record) {
  let body = null;
  try { body = await request.json(); } catch {}
  const callKey = typeof body?.session_key === 'string' ? body.session_key.trim() : '';
  if (!CALL_KEY.test(callKey)) {
    console.log('Code word: no valid session key.');
    return json({ ok: false }, 400);
  }
  const outcome = await record({ callKey });
  console.log(`Code word: ${outcome}.`);
  return outcome === 'recorded' || outcome === 'repeat' ? json({ ok: true }) : json({ ok: false }, 404);
}
