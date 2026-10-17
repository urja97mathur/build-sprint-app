import { useEffect, useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../../convex/_generated/api.js';
import { startCall } from './session.jsx';
import {
  AlertIcon, Back, CheckIcon, ChevronRight, ClockIcon, InfoIcon, Logo, PhoneIcon, PinOffIcon, Spinner, Top,
  clearFlash, firstName, go, readFlash, showPhone,
} from './ui.jsx';

const NEXT = {
  phone: 'Add the mobile number we’ll ring.',
  contact: 'Add a trusted contact we can alert.',
  codeword: 'Choose the code phrase you’ll say on a call.',
};
const COUNT = ['', 'One step left.', 'Two steps left.', 'Three steps left.'];

// After "I'm safe": whether each contact who got an alert was told she's safe. "Told" means WhatsApp accepted it.
function SessionEnded({ flash }) {
  const updates = useQuery(api.safety.safeUpdates) ?? [];
  if (!flash && !updates.length) return null;
  const name = update => update.contactName ?? 'your contact';
  const failed = updates.filter(update => update.status === 'failed' || update.status === 'unconfirmed');
  return (
    <>
      <div className="note box n-ok" role="status">
        {flash && <div><PinOffIcon /><span><b>Session ended.</b> Location sharing stopped.</span></div>}
        {updates.filter(update => update.status === 'sent').map(update => (
          <div key={update.id}><CheckIcon /><span>Told {name(update)} you’re safe</span></div>
        ))}
        {updates.filter(update => update.status === 'sending').map(update => (
          <div key={update.id}><ClockIcon /><span>Telling {name(update)} you’re safe…</span></div>
        ))}
      </div>
      {failed.map(update => (
        <div key={update.id} className="note n-bad" role="alert">
          <AlertIcon />
          <span>{update.status === 'failed' ? `Couldn’t tell ${name(update)} you’re safe.` : `We couldn’t confirm ${name(update)} was told you’re safe.`}</span>
        </div>
      ))}
    </>
  );
}

function Row({ href, onClick, label, detail, warn = false }) {
  const inside = <><span>{label}</span><span className={`mut${warn ? ' warn' : ''}`}>{detail}<ChevronRight /></span></>;
  return href
    ? <a className="nav-row" href={href}>{inside}</a>
    : <button type="button" className="nav-row" onClick={onClick}>{inside}</button>;
}

// Home after sign-in: Call me once setup is ready, otherwise what's left to do.
export function Home({ status }) {
  const start = useAction(api.safety.start);
  const [flash] = useState(readFlash);
  useEffect(() => clearFlash(), []);
  const greeting = firstName(status.name);
  const top = <Top back={<p className="hi">{greeting ? `Hi, ${greeting}` : 'Hi'}</p>} right={<Logo size={40} label="Companion logo" />} />;

  function callMe() {
    startCall(start);
    go('session');
  }

  if (status.nextStep) {
    const left = [!status.hasPhone, !status.contacts, !status.codeWordSaved].filter(Boolean).length;
    return (
      <main className="screen tight">
        {top}
        <div className="home-center compact">
          <button type="button" className="call small dim" disabled><PhoneIcon /><span>Call me</span></button>
          <p className="sub">Call me works once setup is done.</p>
        </div>
        <div className="note box n-info">
          <div><InfoIcon /><span><b>{COUNT[left]}</b> {NEXT[status.nextStep]}</span></div>
          <button type="button" className="btn" onClick={() => go(status.nextStep)}>Finish setup</button>
        </div>
        <nav className="nav" aria-label="Your setup">
          <Row onClick={() => go(status.contacts ? 'contacts' : 'contact')} label="Trusted contacts" detail={status.contacts} />
          <Row onClick={() => go('codeword')} label="Code word" detail={status.codeWordSaved ? 'Saved' : 'Not set'} warn={!status.codeWordSaved} />
        </nav>
      </main>
    );
  }

  return (
    <main className="screen tight">
      {top}
      <SessionEnded flash={flash} />
      <div className={`home-center${flash ? ' compact' : ''}`}>
        <button type="button" className={`call${flash ? ' small' : ''}`} onClick={callMe}><PhoneIcon /><span>Call me</span></button>
        <div className="caption">
          <p className="sub">Feel unsafe? We’ll call you now.</p>
          <p className="ready"><i />Ready to call</p>
        </div>
      </div>
      <nav className="nav" aria-label="Your safety call">
        <Row onClick={() => go('contacts')} label="Trusted contacts" detail={status.contacts} />
        <Row onClick={() => go('codeword')} label="Code word" detail="Saved" />
        <Row href="/demo.html" label="Hear a demo call" />
        <Row onClick={() => go('settings')} label="Settings" />
      </nav>
    </main>
  );
}

// Her account, and Log out.
export function Settings() {
  const account = useQuery(api.setup.account);
  const { signOut } = useAuthActions();
  const [leaving, setLeaving] = useState(false);

  async function logOut() {
    setLeaving(true);
    try { await signOut(); } finally { go('login', { replace: true }); }
  }

  return (
    <main className="screen">
      <Top back={<Back to="home" label="Back to home" />} />
      <h1 className="h-md">Settings.</h1>
      <p className="grp">Your account</p>
      <div className="facts">
        <div className="fact"><span>Name</span><span className="mut">{account?.name ?? '…'}</span></div>
        <div className="fact"><span>Email</span><span className="mut">{account?.email ?? '…'}</span></div>
        <div className="fact"><span>Mobile number</span><span className="mut">{account ? showPhone(account.phone) || 'Not added' : '…'}</span></div>
      </div>
      <div className="grow" />
      <button type="button" className="btn2 out" disabled={leaving} onClick={logOut}>{leaving ? 'Logging out…' : 'Log out'}</button>
      <p className="fine">Companion · test version</p>
    </main>
  );
}

// While the setup loads. After 10 seconds without it, show the error with a way to retry.
export function Loading() {
  const [late, setLate] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setLate(true), 10000);
    return () => clearTimeout(timer);
  }, []);
  if (!late) {
    return (
      <main className="screen">
        <div className="center">
          <Logo size={72} />
          <div style={{ width: 28, height: 28 }}><Spinner /></div>
          <p className="sub" role="status">Loading your safety setup…</p>
        </div>
      </main>
    );
  }
  return (
    <main className="screen">
      <div className="center">
        <div className="disc d-bad" style={{ width: 72, height: 72, marginBottom: 0 }}><AlertIcon /></div>
        <p className="st" role="alert">Couldn’t load your safety setup.</p>
        <p className="sub">Check your connection, then try again.</p>
      </div>
      <button type="button" className="btn" onClick={() => location.reload()}>Try again</button>
    </main>
  );
}
