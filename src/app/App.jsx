import { useEffect } from 'react';
import { useConvexAuth, useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../../convex/_generated/api.js';
import { Account, Login, ProfileStep, Verify, Welcome, clearPending, readPending } from './signin.jsx';
import { AddContact, ContactList } from './contacts.jsx';
import { CodeWord } from './codeword.jsx';
import { Home, Loading } from './home.jsx';
import { Session, callStarting } from './session.jsx';
import { Redirect, useRoute } from './ui.jsx';

// Welcome → demo → account → email code → trusted contact → code phrase → Home → "Call me" → safety session.
// Signed-out visitors see only Welcome and the sign-in screens; signed-in ones go to the first missing step or Home.
// While a safety session is on, the app always opens on it, until she taps "I'm safe".
export default function App() {
  const route = useRoute();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const status = useQuery(api.setup.status, isAuthenticated ? {} : 'skip');

  // A finished sign-in no longer needs its saved details, unless the name or number step still uses them.
  useEffect(() => {
    if (status && !['name', 'phone'].includes(status.nextStep) && readPending()) clearPending();
  }, [status]);

  if (isLoading) return <Loading />;
  if (!isAuthenticated) {
    if (route === 'login') return <Login />;
    if (route === 'verify') return <Verify />;
    if (route === 'account') return <Account />;
    if (route === '') return <Welcome />;
    return <Redirect to="login" />;
  }
  if (status === undefined) return <Loading />;
  if (status === null) return <SignOut />;
  if (status.nextStep === 'name') return <ProfileStep step="name" />;
  if (status.activeSession && route !== 'session') return <Redirect to="session" />;

  switch (route) {
    case 'home': return <Home status={status} />;
    case 'session': return status.activeSession || callStarting() ? <Session /> : <Redirect to="home" />;
    case 'phone': return status.hasPhone ? <Redirect to="home" /> : <ProfileStep step="phone" />;
    case 'contacts': return <ContactList />;
    case 'contact': return <AddContact nextStep={status.nextStep} />;
    case 'add-contact': return <AddContact fromList />;
    case 'codeword': return status.codeWordSaved ? <Redirect to="home" /> : <CodeWord />;
    default: return <Redirect to={status.nextStep ?? 'home'} />;
  }
}

// Signed in, but the account no longer exists: sign out and start again at log in.
function SignOut() {
  const { signOut } = useAuthActions();
  useEffect(() => { signOut().finally(() => location.replace('#login')); }, []);
  return <Loading />;
}
