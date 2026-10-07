import './style.css';

const button = document.querySelector('#call');
const status = document.querySelector('#status');
const access = new URLSearchParams(location.hash.slice(1)).get('access');
if (access) {
  sessionStorage.setItem('call-test-access', access);
  history.replaceState(null, '', location.pathname + location.search);
}
const token = sessionStorage.getItem('call-test-access') || '';
// Only the public Convex address may enter the bundle. All Sarvam settings stay server-side.
const origin = import.meta.env.VITE_CONVEX_URL
  ? import.meta.env.VITE_CONVEX_URL.replace(/\.convex\.cloud$/, '.convex.site')
  : location.origin;
let requested = sessionStorage.getItem('call-test-requested') === 'yes';

function show(message, error = false) {
  status.textContent = message;
  status.classList.toggle('error', error);
}
async function request(path, method = 'GET') {
  const response = await fetch(`${origin}/api/${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.message), { result });
  return result;
}

async function check() {
  if (!token) {
    show('Open your private test link to use this demo.');
    return;
  }
  try {
    const result = await request('call-setup');
    if (!result.ready) {
      show('The calling connection isn’t set up yet. Your phone won’t ring until it’s connected.');
      button.textContent = 'Call not ready';
      return;
    }
    if (requested) {
      show('A call was already requested in this tab. Check your phone and Sarvam’s call log before starting another test.');
      return;
    }
    show('Ready when you are.');
    button.disabled = false;
  } catch (error) {
    show(error.result?.message || 'Couldn’t check the call setup. Refresh to try again.', true);
  }
}

button.addEventListener('click', async () => {
  if (requested) return;
  requested = true;
  sessionStorage.setItem('call-test-requested', 'yes');
  button.disabled = true;
  button.textContent = 'Requesting call…';
  show('Asking your AI companion to call you…');
  try {
    await request('call', 'POST');
    button.textContent = 'Call requested';
    show('Call requested. Answer when your phone rings. This doesn’t confirm the call connected.');
  } catch (error) {
    const uncertain = !error.result || error.result.uncertain;
    if (uncertain) {
      button.textContent = 'Check your phone';
      show('We couldn’t confirm the call request. It may still ring. Check your phone and Sarvam’s call log before trying again.', true);
    } else {
      requested = false;
      sessionStorage.removeItem('call-test-requested');
      button.textContent = 'Try again';
      button.disabled = false;
      show(error.result.message, true);
    }
  }
});
check();
