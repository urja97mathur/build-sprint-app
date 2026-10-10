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

export class TimeoutError extends Error {}
export function withTimeout(promise, ms = 10000) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new TimeoutError()), ms); })])
    .finally(() => clearTimeout(timer));
}
// The server's own words for problems it explains (ConvexError), otherwise the fallback.
export const problem = (error, fallback) => (error instanceof ConvexError && error.data?.message) || fallback;
export const fieldOf = error => (error instanceof ConvexError && error.data?.field) || null;

// Line icons, drawn on a 24-unit grid in the text colour.
const Icon = ({ children }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>
);
export const ChevronLeft = () => <Icon><path d="M15 18l-6-6 6-6" /></Icon>;
export const ChevronRight = () => <Icon><path d="M9 18l6-6-6-6" /></Icon>;
export const PersonIcon = () => <Icon><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" /></Icon>;
export const LockIcon = () => <Icon><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></Icon>;
export const PlayIcon = () => <Icon><circle cx="12" cy="12" r="9" /><path d="M10 8.8v6.4l5.2-3.2z" /></Icon>;
export const ReadyIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="11" fill="#16A34A" />
    <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// The `<` back control at the top left, with an optional label in the middle.
export function TopBar({ to, href, label }) {
  const back = href
    ? <a className="back" href={href} aria-label="Back"><ChevronLeft /></a>
    : to !== undefined && <button type="button" className="back" aria-label="Back" onClick={() => go(to)}><ChevronLeft /></button>;
  return <header className="topbar">{back}{label && <p className="eyebrow">{label}</p>}</header>;
}

export function Field({ id, label, error, hint, hiddenLabel = false, ...input }) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label className={hiddenLabel ? 'visually-hidden' : 'label'} htmlFor={id}>{label}</label>
      <input id={id} className="input" aria-invalid={Boolean(error)} aria-describedby={describedBy} {...input} />
      {hint && <p id={`${id}-hint`} className="hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="field-error">{error}</p>}
    </div>
  );
}

export function Status({ message, error = false, center = false }) {
  return <p className={`status${error ? ' error' : ''}${center ? ' center' : ''}`} role="status" aria-live="polite">{message}</p>;
}

// The same soft swirl orb as the call and demo pages.
export function Orb() {
  return (
    <svg className="orb" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="orb-body" cx="45%" cy="42%" r="62%">
          <stop offset="0" stopColor="#A9CCF6" />
          <stop offset="1" stopColor="#D6E8FB" />
        </radialGradient>
        <radialGradient id="orb-fade">
          <stop offset=".93" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="orb-edge"><circle cx="100" cy="100" r="100" fill="url(#orb-fade)" /></mask>
        <filter id="orb-wide" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16" /></filter>
        <filter id="orb-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9" /></filter>
      </defs>
      <g mask="url(#orb-edge)">
        <circle cx="100" cy="100" r="100" fill="url(#orb-body)" />
        <g className="orb-swirl">
          <g fill="#5B8DEF" filter="url(#orb-wide)">
            <ellipse cx="114" cy="86" rx="46" ry="36" opacity=".9" />
            <ellipse cx="60" cy="124" rx="40" ry="34" opacity=".95" />
          </g>
          <g fill="none" stroke="#F5F9FF" strokeLinecap="round" filter="url(#orb-soft)" opacity=".75">
            <path d="M46 52 C 84 22, 150 34, 160 80" strokeWidth="22" />
            <path d="M98 108 C 80 140, 104 172, 156 150" strokeWidth="24" />
          </g>
        </g>
      </g>
    </svg>
  );
}

// "+919876543210" → "+91 98765 43210" for reading; other numbers are shown as saved.
export const showPhone = phone => (/^\+91\d{10}$/.test(phone) ? `+91 ${phone.slice(3, 8)} ${phone.slice(8)}` : phone);
