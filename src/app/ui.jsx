import { useEffect, useState } from 'react';
import { ConvexError } from 'convex/values';

// Screens live in the address's #part, because the static host serves only exact file paths.
const readRoute = () => location.hash.replace(/^#\/?/, '');
export function useRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const update = () => setRoute(readRoute());
    addEventListener('hashchange', update);
    return () => removeEventListener('hashchange', update);
  }, []);
  return route;
}
export function go(route, { replace = false } = {}) {
  if (replace) location.replace(`#${route}`);
  else location.hash = route;
}
export function Redirect({ to }) {
  useEffect(() => go(to, { replace: true }), [to]);
  return null;
}

// A one-time message for the next screen, such as "Session ended…" on Home. Kept for this tab only.
export function setFlash(text) {
  try { sessionStorage.setItem('flash', text); } catch {}
}
export function readFlash() {
  try { return sessionStorage.getItem('flash') ?? ''; } catch { return ''; }
}
export function clearFlash() {
  try { sessionStorage.removeItem('flash'); } catch {}
}

export class TimeoutError extends Error {}
export function withTimeout(promise, ms = 10000) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new TimeoutError()), ms); })])
    .finally(() => clearTimeout(timer));
}
// The server's own words for problems it explains (ConvexError), otherwise the fallback.
export const problem = (error, fallback) => (error instanceof ConvexError && error.data?.message) || fallback;
export const fieldOf = error => (error instanceof ConvexError && error.data?.field) || null;

// "+919876543210" → "+91 98765 43210" for reading; other numbers are shown as saved.
export const showPhone = phone => (/^\+91\d{10}$/.test(phone ?? '') ? `+91 ${phone.slice(3, 8)} ${phone.slice(8)}` : phone ?? '');
// The 10 digits after +91, spaced like the field shows them: "98765 43210".
export const nationalPart = phone => (/^\+91\d{10}$/.test(phone ?? '') ? `${phone.slice(3, 8)} ${phone.slice(8)}` : '');
export const firstName = name => String(name ?? '').trim().split(/\s+/)[0] || '';

// Line icons on a 24-unit grid, in the text colour (the canvas's icon set).
const Icon = ({ children, width = 2 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>
);
export const ChevronLeft = () => <Icon><path d="M15 18l-6-6 6-6" /></Icon>;
export const ChevronRight = () => <Icon><path d="M9 18l6-6-6-6" /></Icon>;
export const PhoneIcon = () => <Icon width={1.8}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></Icon>;
export const CheckIcon = () => <Icon width={2.2}><path d="M5 12.5l4.5 4.5L19 7.5" /></Icon>;
export const AlertIcon = () => <Icon><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5v.01" /></Icon>;
export const InfoIcon = () => <Icon><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.5v.01" /></Icon>;
export const ClockIcon = () => <Icon><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>;
export const WarningIcon = () => <Icon><path d="M12 8v5M12 16.5v.01" /><path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></Icon>;
export const PinIcon = () => <Icon><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></Icon>;
export const PinOffIcon = () => <Icon><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><path d="M4 4l16 16" /></Icon>;
export const PauseIcon = () => <Icon><path d="M9 5v14M15 5v14" /></Icon>;
export const ChatIcon = () => <Icon><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Icon>;
export const MicIcon = () => <Icon width={1.8}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></Icon>;
export const WaveIcon = () => <Icon><path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" /></Icon>;
export const PersonIcon = () => <Icon width={1.8}><circle cx="12" cy="9" r="3.5" /><path d="M5 20c1.2-3.3 3.8-5 7-5s5.8 1.7 7 5" /></Icon>;
export const PencilIcon = () => <Icon width={1.8}><path d="M4 20h4L19 9l-4-4L4 16z" /></Icon>;
export const PlusIcon = () => <Icon><path d="M12 5v14M5 12h14" /></Icon>;
export const LockIcon = () => <Icon width={1.8}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Icon>;
export const Spinner = ({ light = false }) => (
  <svg className="spin" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="9" stroke={light ? '#FFFFFF' : '#EEE3E8'} strokeOpacity={light ? 0.35 : 1} strokeWidth="3" />
    <path d="M12 3a9 9 0 0 1 9 9" stroke={light ? '#FFFFFF' : '#7A4CC2'} strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// The A · Voice logo: a dot with voice waves, white on the call gradient.
export function Logo({ size = 40, label }) {
  return (
    <div className={`logo s${size}`} {...(label ? { role: 'img', 'aria-label': label } : {})}>
      <svg viewBox="0 0 120 120" fill="none" aria-hidden="true" focusable="false">
        <circle cx="46" cy="60" r="12" fill="#FFFFFF" />
        <path d="M60.1 43.1A22 22 0 0 1 60.1 76.9" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" />
        <path d="M69.1 32.4A36 36 0 0 1 69.1 87.6" stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="10" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// The `<` back control: a link (`href`) or a screen in this app (`to`).
export function Back({ to, href, label = 'Back', disabled = false }) {
  if (href) return <a className="icon-btn" href={href} aria-label={label}><ChevronLeft /></a>;
  return <button type="button" className="icon-btn" aria-label={label} disabled={disabled} onClick={() => go(to)}><ChevronLeft /></button>;
}
// The row at the top of a screen: back on the left (or nothing), something on the right.
export function Top({ back, right }) {
  return <div className="top">{back ?? <span />}{right}</div>;
}
// Setup progress: step 1 fills the first half, step 2 both.
export const StepBar = ({ step }) => (
  <div className="bar" role="img" aria-label={`Step ${step} of 2`}><span className="on" /><span className={step === 2 ? 'on' : ''} /></div>
);

// A labelled field. `prefix` puts a fixed "+91" and a divider in front; `error` shows under it in red.
export function Field({ id, label, error, hint, prefix, disabled, ...input }) {
  const describedBy = [hint && !error && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="fl">
      <label className="lbl" htmlFor={id}>{label}</label>
      <div className={`field${error ? ' bad' : ''}${disabled ? ' off' : ''}`}>
        {prefix && <><span>{prefix}</span><span className="sep" /></>}
        <input id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy} disabled={disabled} {...input} />
      </div>
      {error
        ? <p id={`${id}-error`} className="errt" role="alert"><AlertIcon />{error}</p>
        : hint && <p id={`${id}-hint`} className="hint">{hint}</p>}
    </div>
  );
}

// A note: info (blush), bad (red) or ok (green), with its icon.
const NOTE_ICONS = { info: InfoIcon, bad: AlertIcon, ok: CheckIcon };
export function Note({ kind = 'info', icon, children, live = true }) {
  const Glyph = icon ?? NOTE_ICONS[kind];
  return (
    <div className={`note n-${kind}`} role={live ? (kind === 'bad' ? 'alert' : 'status') : undefined}>
      <Glyph /><span>{children}</span>
    </div>
  );
}
