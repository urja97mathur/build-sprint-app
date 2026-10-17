import { useEffect } from 'react';
import { useConvexAuth, useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../../convex/_generated/api.js';
import { Account, Login, ProfileStep, Welcome } from './signin.jsx';
import { AddContact, ContactList } from './contacts.jsx';
import { CodeWord, CodeWordSaved } from './codeword.jsx';
import { Home, Loading, Settings } from './home.jsx';
import { Session, callStarting } from './session.jsx';
import { Redirect, useRoute } from './ui.jsx';

// Welcome → demo → account (Continue with Google) → mobile number → trusted contact → code phrase → Home →
// "Call me" → safety session. Signed-out visitors see only Welcome and the sign-in screens; signed-in ones go to the
// first missing step or Home. While a safety session is on, the app always opens on it, until she taps "I'm safe".
export default function App() {
  const route = useRoute();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const status = useQuery(api.setup.status, isAuthenticated ? {} : 'skip');

  if (isLoading) return <Loading />;
  if (!isAuthenticated) {
    if (route === 'login') return <Login />;
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
    case 'session': return status.activeSession || callStarting() ? <Session contactName={status.firstContact} /> : <Redirect to="home" />;
    case 'phone': return status.hasPhone ? <Redirect to={status.nextStep ?? 'home'} /> : <ProfileStep step="phone" />;
    case 'contacts': return <ContactList />;
    case 'contact': return <AddContact nextStep={status.nextStep} />;
    case 'add-contact': return <AddContact fromList />;
    case 'codeword': return status.codeWordSaved ? <CodeWordSaved contactName={status.firstContact} /> : <CodeWord contactName={status.firstContact} />;
    case 'settings': return <Settings />;
    default: return <Redirect to={status.nextStep ?? 'home'} />;
  }
}

// Signed in, but the account no longer exists: sign out and start again at log in.
function SignOut() {
  const { signOut } = useAuthActions();
  useEffect(() => { signOut().finally(() => location.replace('#login')); }, []);
  return <Loading />;
}
