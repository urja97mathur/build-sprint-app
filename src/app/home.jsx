import { useEffect, useState } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { ChevronRight, LockIcon, PersonIcon, PlayIcon, ReadyIcon, Status, go } from './ui.jsx';

const MISSING = { contact: 'Add a trusted contact', codeword: 'Choose your code phrase' };
const HEADLINE = 'A voice with you on your walk.';

// Home after sign-in. "Call me" for a real safety call comes in milestone 4.
export function Home({ status }) {
  const { signOut } = useAuthActions();
  const [leaving, setLeaving] = useState(false);

  async function logOut() {
    setLeaving(true);
    try { await signOut(); } finally { go('login', { replace: true }); }
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
        <p className="ready" role="status"><ReadyIcon /> Safety setup ready</p>
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
