import { useEffect, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { ConvexError } from 'convex/values';
import { api } from '../../convex/_generated/api.js';
import {
  AlertIcon, ChatIcon, CheckIcon, ClockIcon, Note, PauseIcon, PhoneIcon, PinIcon, PinOffIcon, Top, TimeoutError, WarningIcon,
  go, problem, setFlash, showPhone, withTimeout,
} from './ui.jsx';

// Asks Convex for the call. A timeout or lost connection may still ring her phone, so it counts as unconfirmed.
const GENERIC = 'Couldn’t place the call. Try again.';
function requestCall(start) {
  return withTimeout(start({}), 15000).catch(error =>
    error instanceof ConvexError
      ? { ok: false, message: problem(error, GENERIC) }
      : { ok: true, outcome: 'unconfirmed' });
}

// "Call me" runs from Home and its answer is picked up here, so changing screens never asks for a second call.
let starting = null;
export const callStarting = () => Boolean(starting);
export function startCall(start) {
  starting = requestCall(start);
}

const time = at => new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const clock = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

// The call's state: the disc, the headline and the line under it. The page only knows what it asked for.
function callView(state, message, phone) {
  if (state === 'requesting') return { disc: 'd-ring', Icon: PhoneIcon, title: 'Asking Simran to call you…', text: 'Keep walking. Your phone should ring in a moment.' };
  if (state === 'requested') return { disc: 'd-call', Icon: CheckIcon, title: 'Call requested.', text: phone ? `Simran will ring ${showPhone(phone)}.` : 'Answer when your phone rings.' };
  if (state === 'unconfirmed') return { disc: 'd-bad', Icon: WarningIcon, title: 'Couldn’t confirm the call.', text: 'If your phone didn’t ring, ask for another call.', error: true };
  return { disc: 'd-bad', Icon: AlertIcon, title: 'Couldn’t place the call.', text: message && message !== GENERIC ? message : 'Try again in a moment.', error: true };
}

// An alert sent during the session. "Sent" means WhatsApp accepted it, not that it was seen; the location is the
// one her contact was sent, from the time it was recorded (never live).
function AlertCard({ alert }) {
  const to = alert.contactName ?? 'your contact';
  const status = alert.delivery?.status ?? 'sending';
  const at = alert.delivery?.sentAt ? ` at ${time(alert.delivery.sentAt)}` : '';
  const where = alert.location ? `with your location from ${time(alert.location.measuredAt)}` : 'without a location';
  const emergency = alert.reason === 'emergency';
  const card =
    status === 'sent' ? (emergency
      ? { kind: 'ok', Icon: CheckIcon, title: `Alert sent to ${to}`, detail: `On WhatsApp${at}, ${where}` }
      : { kind: 'info', Icon: ChatIcon, title: `Asked ${to} to check on you`, detail: `On WhatsApp${at}, ${where}` })
    : status === 'failed' ? { kind: 'bad', Icon: AlertIcon, title: emergency ? `Couldn’t alert ${to}` : `Couldn’t ask ${to} to check on you`, detail: 'Call them yourself if you can.' }
    : status === 'unconfirmed' ? { kind: 'bad', Icon: AlertIcon, title: emergency ? 'We couldn’t confirm the alert reached WhatsApp' : 'We couldn’t confirm the check-in alert reached WhatsApp', detail: `Call ${to} yourself if you can.` }
    : { kind: 'info', Icon: ClockIcon, title: emergency ? `Sending alert to ${to}…` : `Asking ${to} to check on you…` };
  const { Icon } = card;
  return (
    <section className={`note n-${card.kind}`} aria-label={emergency ? 'Emergency alert' : 'Check-in alert'} role="status">
      <Icon /><span>{card.title}{card.detail && <small>{card.detail}</small>}</span>
    </section>
  );
}

// The safety session: a timer, whether her location is reaching Convex, the call's state, alerts, "I'm safe".
export function Session({ contactName }) {
  const session = useQuery(api.safety.current);
  const start = useAction(api.safety.start);
  const end = useMutation(api.safety.end);
  const record = useMutation(api.safety.recordLocation);
  const [call, setCall] = useState(() => (starting ? { state: 'requesting' } : null));
  const [geo, setGeo] = useState(() => ('geolocation' in navigator ? 'waiting' : 'unsupported'));
  const [lastSent, setLastSent] = useState(null);
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState('');
  const [now, setNow] = useState(Date.now());
  const sessionId = session?.id;
  const contact = contactName || 'your trusted contact';

  const show = result => setCall(result.ok ? { state: result.outcome } : { state: 'problem', message: result.message });

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

  // The session timer, and re-checking whether location is still reaching Convex.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
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
  const view = callView(state, call?.message, session?.phone);
  const fresh = lastSent && now - lastSent < 60000;
  const location =
    geo === 'denied' ? { chip: 'c-off', label: 'Location off', Icon: PinOffIcon, title: 'Location is off', detail: 'Allow location for this page so we can include it in an alert.' }
    : fresh ? { chip: 'c-on', label: 'Location on', Icon: PinIcon, title: `Your location is saved for this session. ${contact[0].toUpperCase()}${contact.slice(1)} gets it only if you need help.` }
    : lastSent ? { chip: 'c-pause', label: 'Location paused', Icon: PauseIcon, title: 'Location paused', detail: `Last update ${time(lastSent)}. Keep this page open to keep sharing.` }
    : geo === 'unsupported' ? { chip: 'c-off', label: 'Location off', Icon: PinOffIcon, title: 'Location isn’t available in this browser.' }
    : geo === 'unavailable' ? { chip: 'c-off', label: 'No location', Icon: PinOffIcon, title: 'We can’t get your location right now.' }
    : { chip: 'c-off', label: 'Finding location', Icon: PinIcon, title: 'Finding your location…' };
  const { Icon } = view;
  const LocationIcon = location.Icon;

  // The call couldn't even start a session (for example, today's limit): there's nothing to end.
  if (!sessionId && state === 'problem') {
    return (
      <main className="screen session">
        <Top />
        <div className="callstate">
          <div className={`disc sm ${view.disc}`}><Icon /></div>
          <h1 className="h-sm" role="alert">{view.title}</h1>
          <p className="sub">{view.text}</p>
        </div>
        <div className="grow" />
        <button type="button" className="btn" onClick={() => go('home', { replace: true })}>Back to Home</button>
      </main>
    );
  }

  const again = <button type="button" className={state === 'requested' || state === 'requesting' ? 'btn2' : 'btn'} onClick={callAgain}
    disabled={!sessionId || state === 'requesting'}>{state === 'problem' || state === 'refused' ? 'Try again' : 'Call me again'}</button>;
  const safe = <button type="button" className="btn-safe" onClick={imSafe} disabled={!sessionId || ending}>{ending ? 'Ending…' : 'I’m safe'}</button>;
  return (
    <main className="screen session tight">
      <Top back={<p className="lab">Safety session · {session ? clock(now - session.startedAt) : '0:00'}</p>}
        right={sessionId && <span className={`chip ${location.chip}`}><i />{location.label}</span>} />
      <div className="callstate">
        <div className={`disc sm ${view.disc}`}><Icon /></div>
        <h1 className="h-sm" role={view.error ? 'alert' : 'status'}>{view.title}</h1>
        <p className="sub">{view.text}</p>
      </div>
      <div className="notes">
        {session?.alerts?.map(alert => <AlertCard key={alert.id} alert={alert} />)}
        {sessionId && (
          <div className="note n-info">
            <LocationIcon /><span>{location.title}{location.detail && <small>{location.detail}</small>}</span>
          </div>
        )}
      </div>
      <div className="grow" />
      {endError && <Note kind="bad">{endError}</Note>}
      <div className="stack">
        {state === 'requested' || state === 'requesting' ? <>{safe}{again}</> : <>{again}{safe}</>}
      </div>
    </main>
  );
}
