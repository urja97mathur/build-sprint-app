import { useState } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api.js';
import { normaliseIndianMobile } from '../../convex/lib/demo.js';
import { Field, PhoneField, Status, TopBar, fieldOf, go, problem, withTimeout } from './ui.jsx';

// The number she typed on the demo page in this browser, if any (see src/demo.js).
function demoPhone() {
  try { return localStorage.getItem('walking-companion-phone') ?? ''; } catch { return ''; }
}

// Google's four-colour "G".
const GoogleLogo = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

// "Continue with Google", the only way in (decided 2026-10-16). Google sends her back to the main address, where the
// app finishes signing in and asks for anything Google doesn't give (her mobile number).
function GoogleSignIn() {
  const { signIn } = useAuthActions();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function start() {
    setBusy(true);
    setMessage('');
    try {
      await signIn('google', { redirectTo: '/' });
    } catch {
      setMessage('Couldn’t open Google sign-in. Try again.');
      setBusy(false);
    }
  }
  return (
    <>
      <button type="button" className="google" onClick={start} disabled={busy}>
        <GoogleLogo /><span>{busy ? 'Opening Google…' : 'Continue with Google'}</span>
      </button>
      {message && <Status message={message} error center />}
    </>
  );
}

function Switch({ question, action, to }) {
  return (
    <div className="switch">
      <p>{question}</p>
      <button type="button" className="text-link" onClick={() => go(to)}>{action}</button>
    </div>
  );
}

// First screen for someone who isn't signed in. The walking illustration goes between the words
// and the button once it's saved as its own image.
export function Welcome() {
  return (
    <main className="ui middle center">
      <h1 className="title">A voice with you on your walk.</h1>
      <p className="subtitle">Hear how your AI safety call would sound.</p>
      <a className="primary" href="/demo.html">Try a demo call</a>
      <p className="note">Demo only. No alerts or location sharing.</p>
      <Switch question="Already have an account?" action="Log in" to="login" />
    </main>
  );
}

export function Account() {
  return (
    <main className="ui">
      <TopBar href="/demo.html" />
      <h1 className="title center">Set up your safety call</h1>
      <GoogleSignIn />
      <Switch question="Already have an account?" action="Log in" to="login" />
    </main>
  );
}

export function Login() {
  return (
    <main className="ui">
      <TopBar to="" />
      <h1 className="title center">Welcome back</h1>
      <p className="subtitle center">Log in to your safety call.</p>
      <GoogleSignIn />
      <Switch question="New here?" action="Create account" to="account" />
    </main>
  );
}

// After signing in: her name (`step` 'name') if Google didn't give one, or her mobile number ('phone'),
// filled in from the demo page if she typed it there in this browser.
export function ProfileStep({ step }) {
  const saveProfile = useMutation(api.setup.saveProfile);
  const [value, setValue] = useState(() => (step === 'phone' ? demoPhone() : ''));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(profile) {
    setBusy(true);
    setMessage('');
    try {
      await withTimeout(saveProfile(profile));
    } catch (error) {
      setMessage(fieldOf(error) ? problem(error, 'Check this') : problem(error, 'Couldn’t continue. Try again.'));
      setBusy(false);
    }
  }

  function submit(event) {
    event.preventDefault();
    if (busy || !value.trim()) return;
    if (step === 'phone' && !normaliseIndianMobile(value)) return setMessage('Check this phone number');
    save(step === 'phone' ? { phone: value } : { name: value });
  }

  return (
    <main className="ui">
      <TopBar />
      {step === 'phone' ? (
        <>
          <h1 className="title center">Add your mobile number</h1>
          <p className="subtitle center">Simran will call this number when you tap Call me.</p>
        </>
      ) : (
        <h1 className="title center">Let’s finish setting up your account</h1>
      )}
      <form className="form" onSubmit={submit} noValidate>
        {step === 'phone'
          ? <PhoneField id="phone" label="Your mobile number" value={value} onChange={e => setValue(e.target.value)} disabled={busy} />
          : <Field id="name" label="Your name" placeholder="e.g. Taylor Smith" value={value} onChange={e => setValue(e.target.value)}
              autoComplete="name" maxLength={80} disabled={busy} />}
        <button type="submit" className="primary" disabled={busy || !value.trim()}>{busy ? 'Continuing…' : 'Continue'}</button>
      </form>
      <Status message={message} error center />
    </main>
  );
}
