import { useEffect, useRef, useState } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api.js';
import { cleanName } from '../../convex/lib/setup.js';
import { CODE_MINUTES } from '../../convex/lib/email.js';
import { Field, Status, TimeoutError, TopBar, go, problem, withTimeout } from './ui.jsx';

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
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy || !name.trim() || !email.trim()) return;
    const clean = { name: cleanName(name), email: email.trim().toLowerCase() };
    if (!clean.name) return setErrors({ name: 'Use 80 characters or fewer.' });
    if (!looksLikeEmail(clean.email)) return setErrors({ email: 'Check this email address' });
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
      <form className="form" onSubmit={submit} noValidate>
        <Field id="name" label="Your name" placeholder="e.g. Taylor Smith" value={name} onChange={e => setName(e.target.value)}
          error={errors.name} autoComplete="name" maxLength={80} disabled={busy} />
        <Field id="email" label="Your email" placeholder="you@example.com" type="email" value={email} onChange={e => setEmail(e.target.value)}
          error={errors.email} autoComplete="email" inputMode="email" disabled={busy} />
        <button type="submit" className="primary" disabled={busy || !name.trim() || !email.trim()}>{busy ? 'Continuing…' : 'Continue'}</button>
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

// After a verified sign-in with no name on the account. A name typed on the account screen is used automatically.
export function FinishName() {
  const saveName = useMutation(api.setup.setName);
  const typed = readPending()?.name ?? '';
  const [name, setName] = useState(typed);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(Boolean(typed));
  const tried = useRef(false);

  async function save(value) {
    setBusy(true);
    setMessage('');
    try {
      await withTimeout(saveName({ name: value }));
      clearPending();
    } catch (error) {
      setMessage(problem(error, 'Couldn’t continue. Try again.'));
      setBusy(false);
    }
  }
  useEffect(() => {
    if (typed && !tried.current) { tried.current = true; save(typed); }
  }, []);

  if (typed && busy) return <main className="ui middle"><Status message="Continuing…" center /></main>;
  return (
    <main className="ui">
      <TopBar />
      <h1 className="title center">Let’s finish setting up your account</h1>
      <form className="form" onSubmit={event => { event.preventDefault(); if (!busy && name.trim()) save(name); }} noValidate>
        <Field id="name" label="Your name" placeholder="e.g. Taylor Smith" value={name} onChange={e => setName(e.target.value)}
          autoComplete="name" maxLength={80} disabled={busy} />
        <button type="submit" className="primary" disabled={busy || !name.trim()}>{busy ? 'Continuing…' : 'Continue'}</button>
      </form>
      <Status message={message} error center />
    </main>
  );
}
