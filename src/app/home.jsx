import { useEffect, useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../../convex/_generated/api.js';
import { startCall } from './session.jsx';
import { ChevronRight, LockIcon, PersonIcon, PhoneIcon, PlayIcon, ReadyIcon, Status, clearFlash, go, readFlash } from './ui.jsx';

const MISSING = { phone: 'Add your mobile number', contact: 'Add a trusted contact', codeword: 'Choose your code phrase' };
const HEADLINE = 'A voice with you on your walk.';

// After "I'm safe": whether each contact who got an alert was told she's safe. "Told" means WhatsApp accepted it.
const SAFE_LINES = {
  sending: name => ({ text: `Telling ${name} you’re safe…` }),
  sent: name => ({ text: `Told ${name} you’re safe`, done: true }),
  failed: name => ({ text: `Couldn’t tell ${name} you’re safe.`, error: true }),
  unconfirmed: name => ({ text: `We couldn’t confirm ${name} was told you’re safe.`, error: true }),
};
function SafeUpdates() {
  const updates = useQuery(api.safety.safeUpdates) ?? [];
  return updates.map(update => {
    const line = SAFE_LINES[update.status](update.contactName ?? 'your contact');
    return (
      <p key={update.id} className={`safe-update${line.error ? ' error' : ''}`} role="status">
        {line.done && <ReadyIcon />}<span>{line.text}</span>
      </p>
    );
  });
}

// Home after sign-in: "Call me" once setup is ready, otherwise the missing step.
export function Home({ status }) {
  const { signOut } = useAuthActions();
  const start = useAction(api.safety.start);
  const [leaving, setLeaving] = useState(false);
  const [flash] = useState(readFlash);
  useEffect(() => clearFlash(), []);

  async function logOut() {
    setLeaving(true);
    try { await signOut(); } finally { go('login', { replace: true }); }
  }
  function callMe() {
    startCall(start);
    go('session');
  }

  return (
    <main className="ui home">
      <h1 className="title center">{HEADLINE}</h1>
      {status.nextStep ? (
        <div className="actions">
          <Status message={MISSING[status.nextStep]} center />
          <button type="button" className="primary" onClick={() => go(status.nextStep)}>Finish setup</button>
        </div>
      ) : (
        <>
          <div className="call-ring">
            <button type="button" className="call-me" onClick={callMe}><PhoneIcon /><span>Call me</span></button>
          </div>
          <p className="call-caption">Feel unsafe? We’ll call you right now.</p>
          {flash && <Status message={flash} center />}
          <SafeUpdates />
          <p className="ready" role="status"><ReadyIcon /> Safety setup ready</p>
        </>
      )}
      <ul className="rows">
        <li>
          <button type="button" className="row" onClick={() => go('contacts')}>
            <PersonIcon /><span className="row-text">Trusted contacts</span><ChevronRight />
          </button>
        </li>
        <li>
          {status.codeWordSaved ? (
            <div className="row">
              <LockIcon /><span className="row-text">Code word</span><span className="row-detail">Saved</span>
            </div>
          ) : (
            <button type="button" className="row" onClick={() => go('codeword')}>
              <LockIcon /><span className="row-text">Code word</span><ChevronRight />
            </button>
          )}
        </li>
        <li>
          <a className="row" href="/demo.html"><PlayIcon /><span className="row-text">Try demo</span><ChevronRight /></a>
        </li>
      </ul>
      <button type="button" className="text-link logout" disabled={leaving} onClick={logOut}>Log out</button>
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
  if (!late) return <main className="ui middle"><Status message="Loading your safety setup…" center /></main>;
  return (
    <main className="ui middle">
      <Status message="Couldn’t load your safety setup" error center />
      <div className="actions">
        <button type="button" className="primary" onClick={() => location.reload()}>Try again</button>
        <a className="secondary" href="/demo.html">Try demo</a>
      </div>
    </main>
  );
}
