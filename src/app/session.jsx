import { useEffect, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { ConvexError } from 'convex/values';
import { api } from '../../convex/_generated/api.js';
import { Orb, ReadyIcon, Status, TimeoutError, go, problem, setFlash, withTimeout } from './ui.jsx';

// Asks Convex for the call. A timeout or lost connection may still ring her phone, so it counts as unconfirmed.
function requestCall(start) {
  return withTimeout(start({}), 15000).catch(error =>
    error instanceof ConvexError
      ? { ok: false, message: problem(error, 'Couldn’t place the call. Try again.') }
      : { ok: true, outcome: 'unconfirmed' });
}

// "Call me" runs from Home and its answer is picked up here, so changing screens never asks for a second call.
let starting = null;
export const callStarting = () => Boolean(starting);
export function startCall(start) {
  starting = requestCall(start);
}

const CALL = {
  requesting: { text: 'Asking Simran to call you…' },
  requested: { text: 'Call requested. Answer when your phone rings.' },
  unconfirmed: { text: 'We couldn’t confirm the call request. It may still ring. Check your phone before trying again.', error: true },
  refused: { text: 'Couldn’t place the call. Try again.', error: true },
};
const time = at => new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

// The alert her code word sent: who it went to, whether WhatsApp accepted it (not whether it was seen),
// and the location her contact was sent, with the same map link.
function AlertCard({ alert }) {
  const to = alert.contactName ? ` to ${alert.contactName}` : '';
  const status = alert.delivery?.status ?? 'sending';
  const line =
    status === 'sent' ? { text: `Alert sent${to} on WhatsApp, ${time(alert.delivery.sentAt)}`, sent: true }
    : status === 'failed' ? { text: `Couldn’t send the alert${to}.`, error: true }
    : status === 'unconfirmed' ? { text: 'We couldn’t confirm the alert reached WhatsApp.', error: true }
    : { text: `Sending alert${to}…` };
  const { location } = alert;
  return (
    <section className="alert-card" aria-label="Emergency alert">
      <p className={`alert-status${line.error ? ' error' : ''}`} role="status" aria-live="polite">
        {line.sent && <ReadyIcon />}<span>{line.text}</span>
      </p>
      {location ? (
        <p className="alert-location">
          Location shared:<br />recorded at {time(location.measuredAt)}<br />
          <a className="text-link" href={`https://maps.google.com/?q=${location.latitude.toFixed(5)},${location.longitude.toFixed(5)}`} target="_blank" rel="noopener noreferrer">View on map</a>
        </p>
      ) : (
        <p className="alert-location">Location shared: unavailable</p>
      )}
    </section>
  );
}

// The safety session: the call's status, whether her location is reaching Convex, and "I'm safe".
export function Session() {
  const session = useQuery(api.safety.current);
  const start = useAction(api.safety.start);
  const end = useMutation(api.safety.end);
  const record = useMutation(api.safety.recordLocation);
  const [call, setCall] = useState(() => (starting ? { state: 'requesting' } : null));
  const [geo, setGeo] = useState(() => ('geolocation' in navigator ? 'waiting' : 'unsupported'));
  const [lastSent, setLastSent] = useState(null);
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState('');
  const [, setTick] = useState(0);
  const sessionId = session?.id;

  const show = result => setCall(result.ok ? { state: result.outcome } : { state: 'problem', text: result.message });

  // The answer to "Call me" from Home.
  useEffect(() => {
    if (!starting) return;
    let live = true;
    const promise = starting;
    promise.then(result => {
      if (starting === promise) starting = null;
      if (live) show(result);
    });
    return () => { live = false; };
  }, []);

  // Re-check "Location sharing is on" every few seconds.
  useEffect(() => {
    const timer = setInterval(() => setTick(n => n + 1), 5000);
    return () => clearInterval(timer);
  }, []);

  // Location for this session only: the newest position is sent at most every 10 seconds, and never dropped.
  // Sharing stops when the session ends.
  useEffect(() => {
    if (!sessionId || !('geolocation' in navigator)) return;
    let stopped = false;
    let lastSend = 0;
    let latest = null;
    let waiting = null;
    const flush = async () => {
      waiting = null;
      if (stopped || !latest) return;
      const position = latest;
      latest = null;
      lastSend = Date.now();
      try {
        const { latitude, longitude, accuracy } = position.coords;
        const result = await record({ sessionId, latitude, longitude, accuracy, measuredAt: position.timestamp });
        if (!stopped && !result.stopped) { setLastSent(Date.now()); setGeo('on'); }
      } catch {
        latest ??= position; // keep it for the next try
        lastSend = 0;
      }
    };
    const send = position => {
      if (stopped) return;
      latest = position;
      const wait = 10000 - (Date.now() - lastSend);
      if (wait <= 0) flush();
      else waiting ??= setTimeout(flush, wait);
    };
    const fail = error => { if (!stopped) setGeo(current => (error.code === 1 ? 'denied' : current === 'on' ? 'on' : 'unavailable')); };
    const options = { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 };
    const watch = navigator.geolocation.watchPosition(send, fail, options);
    // A phone standing still may not report new positions, so ask every 20 seconds as well.
    const timer = setInterval(() => navigator.geolocation.getCurrentPosition(send, fail, options), 20000);
    return () => { stopped = true; navigator.geolocation.clearWatch(watch); clearInterval(timer); clearTimeout(waiting); };
  }, [sessionId]);

  async function callAgain() {
    setCall({ state: 'requesting' });
    show(await requestCall(start));
  }

  async function imSafe() {
    if (!sessionId || ending) return;
    setEnding(true);
    setEndError('');
    try {
      await withTimeout(end({ sessionId }));
      setFlash('Session ended. Location sharing stopped.');
      go('home', { replace: true });
    } catch (error) {
      setEndError(error instanceof TimeoutError ? 'We couldn’t confirm your session ended. Try again.' : problem(error, 'Couldn’t end the session. Try again.'));
      setEnding(false);
    }
  }

  const state = call?.state ?? session?.callStatus ?? 'requesting';
  const callView = state === 'problem' ? { text: call.text, error: true } : CALL[state];
  const fresh = lastSent && Date.now() - lastSent < 60000;
  const location =
    geo === 'denied' ? { text: 'Location sharing is off. Allow location for this page in your browser’s settings.', error: true }
    : fresh ? { text: 'Location sharing is on' }
    : lastSent ? { text: `Location sharing paused. Last update at ${time(lastSent)}.`, error: true }
    : geo === 'unsupported' ? { text: 'Location sharing isn’t available in this browser.', error: true }
    : geo === 'unavailable' ? { text: 'We can’t get your location right now.', error: true }
    : { text: 'Waiting for your location…' };

  // The call couldn't even start a session (for example, today's limit): there's nothing to end.
  if (!sessionId && state === 'problem') {
    return (
      <main className="ui middle center session">
        <Orb />
        <Status message={callView.text} error center />
        <button type="button" className="primary" onClick={() => go('home', { replace: true })}>Back to Home</button>
      </main>
    );
  }

  return (
    <main className="ui middle center session">
      <Orb />
      <Status message={callView.text} error={callView.error} center />
      {sessionId && <p className={`location${location.error ? ' error' : ''}`} role="status">{location.text}</p>}
      {session?.alert && <AlertCard alert={session.alert} />}
      <div className="actions">
        <button type="button" className="primary" onClick={imSafe} disabled={!sessionId || ending}>{ending ? 'Ending…' : 'I’m safe'}</button>
        {sessionId && state !== 'requesting' && (
          <button type="button" className="secondary" onClick={callAgain}>{state === 'requested' ? 'Call me again' : 'Try again'}</button>
        )}
      </div>
      <Status message={endError} error center />
    </main>
  );
}
