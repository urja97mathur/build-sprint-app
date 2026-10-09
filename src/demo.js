import './style.css';

// Public demo before sign-up. All limits are checked in Convex; this page only reports what Convex says.
const form = document.querySelector('#demo');
const input = document.querySelector('#phone');
const button = document.querySelector('#call');
const status = document.querySelector('#status');
// Only the public Convex address may enter the bundle. All Sarvam settings stay server-side.
const origin = import.meta.env.VITE_CONVEX_URL
  ? import.meta.env.VITE_CONVEX_URL.replace(/\.convex\.cloud$/, '.convex.site')
  : location.origin;
const UNCONFIRMED = 'We couldn’t confirm the call request. It may still ring. Check your phone before trying again.';

let ready = false;
let busy = false;
let done = false; // after a requested or unconfirmed call: never retry automatically

function show(message, error = false) {
  status.textContent = message;
  status.classList.toggle('error', error);
}
// Same shape the server accepts: 10 digits starting 6–9, with or without +91, 91 or 0.
const looksValid = value => /^(?:\+91|91|0)?[6-9]\d{9}$/.test(value.replace(/[\s()-]/g, ''));
function update() {
  button.disabled = !ready || busy || done || !looksValid(input.value);
  input.disabled = busy || done;
}

async function check() {
  try {
    const response = await fetch(`${origin}/api/demo-call`, { signal: AbortSignal.timeout(15000) });
    if (!(await response.json()).ready) {
      show('The calling connection isn’t set up yet. Your phone won’t ring until it’s connected.');
      button.textContent = 'Call not ready';
      return;
    }
    ready = true;
    show('Ready when you are.');
    update();
  } catch {
    show('Couldn’t check the call setup. Refresh to try again.', true);
  }
}

input.addEventListener('input', update);
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (button.disabled) return;
  busy = true;
  update();
  button.textContent = 'Requesting call…';
  show('Asking your AI companion to call you…');
  try {
    const response = await fetch(`${origin}/api/demo-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: input.value }),
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json();
    if (response.ok) {
      done = true;
      button.textContent = 'Call requested';
      show('Call requested. Answer when your phone rings. This doesn’t confirm the call connected.');
    } else if (result.uncertain) {
      done = true;
      button.textContent = 'Check your phone';
      show(UNCONFIRMED, true);
    } else {
      button.textContent = response.status === 424 ? 'Try again' : 'Call me';
      show(result.message, true);
    }
  } catch {
    // The request may have reached Sarvam before the connection failed.
    done = true;
    button.textContent = 'Check your phone';
    show(UNCONFIRMED, true);
  }
  busy = false;
  update();
});
check();
