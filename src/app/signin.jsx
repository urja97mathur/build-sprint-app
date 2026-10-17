import { useState } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api.js';
import { normaliseIndianMobile } from '../../convex/lib/demo.js';
import { Back, Field, Logo, Note, Top, fieldOf, problem, withTimeout } from './ui.jsx';

// The number she typed on the demo page in this browser, if any (see src/demo.js).
function demoPhone() {
  try { return localStorage.getItem('walking-companion-phone') ?? ''; } catch { return ''; }
}

// Google's four-colour "G".
const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.2-2.1 3.5-5.2 3.5-8.8z" />
    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.7-4.9h-4v3.1C3.3 21.4 7.3 24 12 24z" />
    <path fill="#FBBC05" d="M5.3 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.6.4-2.4V6.6h-4C.5 8.2 0 10 0 12s.5 3.8 1.3 5.4l4-3z" />
    <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.3 0 3.3 2.6 1.3 6.6l4 3.1c1-2.9 3.6-4.9 6.7-4.9z" />
  </svg>
);

// The walk-home illustration: a dotted path from her, with voice waves, to a house.
const WalkHome = () => (
  <svg viewBox="0 0 390 400" fill="none" aria-hidden="true" focusable="false">
    <defs><linearGradient id="walker" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7A4CC2" /><stop offset="1" stopColor="#B84D78" /></linearGradient></defs>
    <circle cx="240" cy="180" r="150" fill="#F3E6EE" />
    <circle cx="96" cy="292" r="92" fill="#F6ECF2" />
    <circle cx="318" cy="64" r="3" fill="#C9A6C4" />
    <circle cx="64" cy="96" r="2.5" fill="#C9A6C4" />
    <circle cx="200" cy="40" r="2" fill="#C9A6C4" />
    <path d="M30 390C90 350 40 280 140 252S270 210 250 150S300 92 312 100" stroke="#C9A6C4" strokeWidth="4" strokeLinecap="round" strokeDasharray="1 13" />
    <path d="M298 116V100L312 88L326 100V116Z" fill="#FFFFFF" stroke="#7A4CC2" strokeWidth="3" strokeLinejoin="round" />
    <path d="M162 230A28 28 0 0 1 162 270" stroke="#B84D78" strokeWidth="5" strokeLinecap="round" />
    <path d="M174 216A46 46 0 0 1 174 284" stroke="#B84D78" strokeOpacity="0.45" strokeWidth="5" strokeLinecap="round" />
    <circle cx="140" cy="250" r="15" fill="url(#walker)" stroke="#FFFFFF" strokeWidth="5" />
  </svg>
);

// "Continue with Google" (or "Sign up with Google"), the only way in (decided 2026-10-16). Google sends her back
// to the main address, where the app finishes signing in and asks for anything Google doesn't give.
function GoogleButton({ label, onProblem }) {
  const { signIn } = useAuthActions();
  const [busy, setBusy] = useState(false);
  async function start() {
    setBusy(true);
    onProblem('');
    try {
      await signIn('google', { redirectTo: '/' });
    } catch {
      onProblem('Couldn’t open Google sign-in. Try again.');
      setBusy(false);
    }
  }
  return (
    <button type="button" className="btn2" onClick={start} disabled={busy}>
      <GoogleLogo /><span>{busy ? 'Opening Google…' : label}</span>
    </button>
  );
}

// First screen for someone who isn't signed in.
export function Welcome() {
  return (
    <main className="screen welcome">
      <div className="brand"><Logo size={32} /><span>Companion</span></div>
      <div className="hero"><WalkHome /></div>
      <h1 className="h-xl">Never walk home alone.</h1>
      <div className="stack">
        <a className="btn" href="/demo.html">Hear a demo call</a>
        <p className="fine">Demo only. No alerts or location sharing.</p>
        <p className="link">Have an account? <a className="text-link" href="#login">Log in</a></p>
      </div>
    </main>
  );
}

// Sign-up and log in share one layout: words in the middle, Google and the other screen's link at the bottom.
function SignInScreen({ back, title, subtitle, button, question, action, to }) {
  const [message, setMessage] = useState('');
  return (
    <main className="screen">
      <Top back={<Back {...back} />} />
      <div className="mid">
        <h1 className="h-xl">{title}</h1>
        <p className="sub">{subtitle}</p>
      </div>
      <div className="stack">
        {message && <Note kind="bad">{message}</Note>}
        <GoogleButton label={button} onProblem={setMessage} />
        <p className="link">{question} <a className="text-link" href={`#${to}`}>{action}</a></p>
      </div>
    </main>
  );
}

export function Account() {
  return (
    <SignInScreen back={{ href: '/demo.html' }} title="Create your account." subtitle="A few quick steps after this, and your safety call is ready."
      button="Sign up with Google" question="Have an account?" action="Log in" to="login" />
  );
}

export function Login() {
  return (
    <SignInScreen back={{ to: '' }} title="Welcome back." subtitle="Log in to reach your safety call."
      button="Continue with Google" question="New here?" action="Create an account" to="account" />
  );
}

// After signing in: her mobile number ('phone'), filled in from the demo page if she typed it there in this
// browser, or her name ('name') if Google didn't give one.
export function ProfileStep({ step }) {
  const saveProfile = useMutation(api.setup.saveProfile);
  const [value, setValue] = useState(() => (step === 'phone' ? demoPhone() : ''));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy || !value.trim()) return;
    if (step === 'phone' && !normaliseIndianMobile(value)) return setError('Check this phone number');
    setError('');
    setBusy(true);
    try {
      await withTimeout(saveProfile(step === 'phone' ? { phone: value } : { name: value }));
    } catch (problemError) {
      setError(fieldOf(problemError) ? problem(problemError, 'Check this') : problem(problemError, 'Couldn’t continue. Try again.'));
      setBusy(false);
    }
  }

  return (
    <form className="screen" onSubmit={submit} noValidate>
      {step === 'phone' ? (
        <>
          <Top />
          <h1 className="h-md">Add your mobile number.</h1>
          <p className="sub">This is the phone we’ll ring when you tap Call me.</p>
          <Field id="phone" label="Mobile number" prefix="+91" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={16}
            placeholder="98765 43210" value={value} onChange={e => { setValue(e.target.value); setError(''); }} disabled={busy}
            error={error} hint="We only use it for your safety calls." />
        </>
      ) : (
        <>
          <Top back={<Logo size={32} />} />
          <h1 className="h-md">What should we call you?</h1>
          <p className="sub">Your trusted contact will see this name if we alert them.</p>
          <Field id="name" label="Your name" placeholder="First name" autoComplete="given-name" maxLength={80}
            value={value} onChange={e => { setValue(e.target.value); setError(''); }} disabled={busy} error={error} />
        </>
      )}
      <div className="grow" />
      <button type="submit" className="btn" disabled={busy || !value.trim()}>{busy ? 'Continuing…' : 'Continue'}</button>
    </form>
  );
}
