import { useEffect, useRef, useState } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api.js';
import { cleanName } from '../../convex/lib/setup.js';
import { CODE_MINUTES } from '../../convex/lib/email.js';
import { normaliseIndianMobile } from '../../convex/lib/demo.js';
import { Field, PhoneField, Status, TimeoutError, TopBar, fieldOf, go, problem, withTimeout } from './ui.jsx';

// The sign-in in progress (name, email, where it started, when the code was sent), kept for this tab only.
const KEY = 'pending-sign-in';
export function readPending() {
  try { return JSON.parse(sessionStorage.getItem(KEY)) ?? null; } catch { return null; }
}
function savePending(pending) {
  try { sessionStorage.setItem(KEY, JSON.stringify(pending)); } catch {}
}
export function clearPending() {
  try { sessionStorage.removeItem(KEY); } catch {}
}

const looksLikeEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
// The number she typed on the demo page in this browser, if any (see src/demo.js).
function demoPhone() {
  try { return localStorage.getItem('walking-companion-phone') ?? ''; } catch { return ''; }
}
const UNCONFIRMED_SEND = 'We couldn’t confirm the code was sent. Check your inbox or try again.';

// 'sent', 'uncertain' (no answer within 10 seconds; the code may still arrive) or 'failed'.
async function sendCode(signIn, email) {
  try {
    await withTimeout(signIn('email', { email }));
    return 'sent';
  } catch (error) {
    return error instanceof TimeoutError ? 'uncertain' : 'failed';
  }
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

// "Continue with Google", then "or" above the email form. Google sends her back to the main address, where the app
// finishes signing in and asks for anything Google doesn't give (her mobile number).
function GoogleSignIn({ disabled }) {
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
      <button type="button" className="google" onClick={start} disabled={busy || disabled}>
        <GoogleLogo /><span>{busy ? 'Opening Google…' : 'Continue with Google'}</span>
      </button>
      {message && <Status message={message} error center />}
      <p className="or"><span>or</span></p>
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
  const { signIn } = useAuthActions();
  const kept = readPending()?.from === 'account' ? readPending() : null;
  const [name, setName] = useState(kept?.name ?? '');
  const [email, setEmail] = useState(kept?.email ?? '');
  const [fromDemo] = useState(() => (kept?.phone ? '' : demoPhone()));
  const [phone, setPhone] = useState(kept?.phone?.replace(/^\+91/, '') ?? fromDemo);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const filled = name.trim() && email.trim() && phone.trim();

  async function submit(event) {
    event.preventDefault();
    if (busy || !filled) return;
    const clean = { name: cleanName(name), email: email.trim().toLowerCase(), phone: normaliseIndianMobile(phone) };
    if (!clean.name) return setErrors({ name: 'Use 80 characters or fewer.' });
    if (!looksLikeEmail(clean.email)) return setErrors({ email: 'Check this email address' });
    if (!clean.phone) return setErrors({ phone: 'Check this phone number' });
    setErrors({});
    setMessage('');
    setBusy(true);
    const result = await sendCode(signIn, clean.email);
    setBusy(false);
    if (result === 'failed') return setMessage('Couldn’t continue. Try again.');
    savePending({ ...clean, from: 'account', sentAt: Date.now(), uncertain: result === 'uncertain' });
    go('verify');
  }

  return (
    <main className="ui">
      <TopBar href="/demo.html" />
      <h1 className="title center">Set up your safety call</h1>
      <GoogleSignIn disabled={busy} />
      <form className="form" onSubmit={submit} noValidate>
        <Field id="name" label="Your name" placeholder="e.g. Taylor Smith" value={name} onChange={e => setName(e.target.value)}
          error={errors.name} autoComplete="name" maxLength={80} disabled={busy} />
        <Field id="email" label="Your email" placeholder="you@example.com" type="email" value={email} onChange={e => setEmail(e.target.value)}
          error={errors.email} autoComplete="email" inputMode="email" disabled={busy} />
        <PhoneField id="phone" label="Your mobile number" value={phone} onChange={e => setPhone(e.target.value)} error={errors.phone}
          hint={fromDemo && phone === fromDemo ? 'From your demo call. Check it’s right.' : 'Simran will call this number.'} disabled={busy} />
        <button type="submit" className="primary" disabled={busy || !filled}>{busy ? 'Continuing…' : 'Continue'}</button>
      </form>
      <Status message={message} error center />
      <Switch question="Already have an account?" action="Log in" to="login" />
    </main>
  );
}

export function Login() {
  const { signIn } = useAuthActions();
  const kept = readPending()?.from === 'login' ? readPending() : null;
  const [email, setEmail] = useState(kept?.email ?? '');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const clean = email.trim().toLowerCase();

  async function submit(event) {
    event.preventDefault();
    if (busy || !looksLikeEmail(clean)) return;
    setMessage('');
    setBusy(true);
    const result = await sendCode(signIn, clean);
    setBusy(false);
    if (result === 'failed') return setMessage('Couldn’t send the code. Try again.');
    savePending({ email: clean, from: 'login', sentAt: Date.now(), uncertain: result === 'uncertain' });
    go('verify');
  }

  return (
    <main className="ui">
      <TopBar to="" />
      <h1 className="title center">Welcome back</h1>
      <p className="subtitle center">Log in to your safety call.</p>
      <GoogleSignIn disabled={busy} />
      <form className="form" onSubmit={submit} noValidate>
        <Field id="email" label="Your email" placeholder="you@example.com" type="email" value={email} onChange={e => setEmail(e.target.value)}
          autoComplete="email" inputMode="email" disabled={busy} />
        <button type="submit" className="primary" disabled={busy || !looksLikeEmail(clean)}>{busy ? 'Sending code…' : 'Send code'}</button>
      </form>
      <Status message={message} error center />
      <Switch question="New here?" action="Create account" to="account" />
    </main>
  );
}

// Six boxes on screen; one real field on top takes typing, pasting and the phone's code suggestion.
function CodeBoxes({ value, onChange, disabled, inputRef }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="code">
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className={`code-box${focused && i === Math.min(value.length, 5) ? ' active' : ''}`} aria-hidden="true">{value[i] ?? ''}</span>
      ))}
      <input ref={inputRef} aria-label="Verification code" value={value} disabled={disabled}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        inputMode="numeric" autoComplete="one-time-code" />
    </div>
  );
}

export function Verify() {
  const { signIn } = useAuthActions();
  const [pending, setPending] = useState(readPending);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState(() => (pending?.uncertain ? { text: UNCONFIRMED_SEND } : { text: '' }));
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [lastRequest, setLastRequest] = useState(pending?.sentAt ?? 0);
  const [now, setNow] = useState(Date.now());
  const input = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!pending) return <AccountRedirect />;

  const update = changes => {
    const next = { ...pending, ...changes };
    setPending(next);
    savePending(next);
  };

  async function verify(event) {
    event.preventDefault();
    if (busy || code.length !== 6) return;
    setBusy(true);
    setMessage({ text: '' });
    try {
      // On success the app moves on by itself once the sign-in is confirmed.
      await withTimeout(signIn('email', { email: pending.email, code }));
    } catch (error) {
      if (error instanceof TimeoutError) setMessage({ text: 'We couldn’t confirm verification. Try again.', error: true });
      else if (Date.now() - pending.sentAt > CODE_MINUTES * 60 * 1000) setMessage({ text: 'Your code expired. Request a new one.', error: true });
      else setMessage({ text: 'That code didn’t work. Check it and try again.', error: true });
      setBusy(false);
      input.current?.focus();
    }
  }

  async function resend() {
    setResending(true);
    setLastRequest(Date.now());
    const result = await sendCode(signIn, pending.email);
    setResending(false);
    if (result === 'failed') return setMessage({ text: 'Couldn’t send the code. Try again.', error: true });
    update({ sentAt: Date.now(), uncertain: result === 'uncertain' });
    setMessage(result === 'sent' ? { text: 'New code sent' } : { text: UNCONFIRMED_SEND });
  }

  const canResend = !busy && !resending && now - lastRequest >= 30 * 1000;
  return (
    <main className="ui">
      <TopBar to={pending.from} />
      <h1 className="title center">Check your email</h1>
      <p className="subtitle center">Enter the code sent to your email at {pending.email}.</p>
      <form className="form" onSubmit={verify} noValidate>
        <CodeBoxes value={code} onChange={setCode} disabled={busy} inputRef={input} />
        <button type="submit" className="primary" disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Verify'}</button>
      </form>
      <Status message={message.text} error={message.error} center />
      <div className="links">
        <button type="button" className="text-link" disabled={!canResend} onClick={resend}>Resend code</button>
        <button type="button" className="text-link" onClick={() => go(pending.from)}>Change email</button>
      </div>
    </main>
  );
}

function AccountRedirect() {
  useEffect(() => go('account', { replace: true }), []);
  return null;
}

// After a verified sign-in: her name (`step` 'name') or mobile number ('phone') if the account doesn't have it.
// What she typed on the account screen is saved automatically; otherwise she types it here.
export function ProfileStep({ step }) {
  const saveProfile = useMutation(api.setup.saveProfile);
  const [typed] = useState(() => {
    const pending = readPending();
    return pending?.name || pending?.phone ? { name: pending.name, phone: pending.phone } : null;
  });
  const [value, setValue] = useState(() => (step === 'phone' ? demoPhone() : ''));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(Boolean(typed));
  const tried = useRef(false);

  async function save(profile) {
    setBusy(true);
    setMessage('');
    try {
      await withTimeout(saveProfile(profile));
      clearPending();
    } catch (error) {
      setMessage(fieldOf(error) ? problem(error, 'Check this') : problem(error, 'Couldn’t continue. Try again.'));
      setBusy(false);
    }
  }
  useEffect(() => {
    if (typed && !tried.current) { tried.current = true; save(typed); }
  }, []);

  function submit(event) {
    event.preventDefault();
    if (busy || !value.trim()) return;
    if (step === 'phone' && !normaliseIndianMobile(value)) return setMessage('Check this phone number');
    save(step === 'phone' ? { phone: value } : { name: value });
  }

  if (typed && busy) return <main className="ui middle"><Status message="Continuing…" center /></main>;
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
