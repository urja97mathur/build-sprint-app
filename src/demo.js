import '@fontsource-variable/geist';
import './ui.css';

// Public demo before sign-up. All limits are checked in Convex; this page only reports what Convex says.
const form = document.querySelector('#demo');
const input = document.querySelector('#phone');
const field = document.querySelector('#phone-field');
const button = document.querySelector('#call');
const note = document.querySelector('#note');
const actions = document.querySelector('#actions');
const used = document.querySelector('#used'); // "Set up my safety call" / "Back to start", once this number had its demo
const after = document.querySelector('#after'); // "Would this feel natural on your walk?", once the call is requested
// Only the public Convex address may enter the bundle. All Sarvam settings stay server-side.
const origin = import.meta.env.VITE_CONVEX_URL
  ? import.meta.env.VITE_CONVEX_URL.replace(/\.convex\.cloud$/, '.convex.site')
  : location.origin;
const UNCONFIRMED = 'We couldn’t confirm the call request. It may still ring. Check your phone before trying again.';

// The note's icons: information, a clock (full today), a problem.
const ICONS = {
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  bad: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.01"/>',
};

let ready = false;
let busy = false;
let done = false; // after a requested or unconfirmed call: never retry automatically

// A note above the buttons: kind 'info' (blush) or 'bad' (red), with an icon. No text hides it.
function show(text, kind = 'info', icon = kind) {
  note.hidden = !text;
  if (!text) return;
  note.className = `note n-${kind === 'bad' ? 'bad' : 'info'}`;
  note.setAttribute('role', kind === 'bad' ? 'alert' : 'status');
  note.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">${ICONS[icon]}</svg><span></span>`;
  note.querySelector('span').textContent = text;
}
// Same shape the server accepts: 10 digits starting 6–9, with or without +91, 91 or 0.
const looksValid = value => /^(?:\+91|91|0)?[6-9]\d{9}$/.test(value.replace(/[\s()-]/g, ''));
function update() {
  button.disabled = !ready || busy || done || !looksValid(input.value);
  input.disabled = busy || done;
  field.classList.toggle('off', input.disabled);
}

async function check() {
  try {
    const response = await fetch(`${origin}/api/demo-call`, { signal: AbortSignal.timeout(15000) });
    if (!(await response.json()).ready) {
      show('The calling connection isn’t set up yet. Your phone won’t ring until it’s connected.');
      return;
    }
    ready = true;
    update();
  } catch {
    show('Couldn’t check the call setup. Refresh to try again.', 'bad');
  }
}

input.addEventListener('input', () => {
  if (!done && !busy && note.classList.contains('n-bad')) show('');
  update();
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (button.disabled) return;
  // Remembered in this browser only, so sign-up can fill in her number. The server keeps only a fingerprint.
  try { localStorage.setItem('walking-companion-phone', input.value.trim()); } catch {}
  busy = true;
  update();
  show('');
  button.textContent = 'Requesting call…';
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
      form.hidden = true;
      after.hidden = false;
    } else if (result.uncertain) {
      done = true;
      button.textContent = 'Check your phone';
      show(UNCONFIRMED, 'bad');
    } else if (response.status === 409) {
      // This number already had its demo: offer the real thing instead.
      done = true;
      show(result.message);
      actions.hidden = true;
      used.hidden = false;
    } else if (response.status === 429) {
      // Full for today: nothing to retry until tomorrow.
      done = true;
      button.textContent = 'Call me';
      show(result.message, 'info', 'clock');
    } else {
      button.textContent = 'Call me';
      show(result.message, 'bad');
    }
  } catch {
    // The request may have reached Sarvam before the connection failed.
    done = true;
    button.textContent = 'Check your phone';
    show(UNCONFIRMED, 'bad');
  }
  busy = false;
  update();
});
check();
