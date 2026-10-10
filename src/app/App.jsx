import { useEffect } from 'react';
import { useConvexAuth, useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../../convex/_generated/api.js';
import { Account, FinishName, Login, Verify, Welcome, clearPending, readPending } from './signin.jsx';
import { AddContact, ContactList } from './contacts.jsx';
import { CodeWord } from './codeword.jsx';
import { Home, Loading } from './home.jsx';
import { Redirect, useRoute } from './ui.jsx';

// Welcome → demo → account → email code → trusted contact → code phrase → Home.
// Signed-out visitors see only Welcome and the sign-in screens; signed-in ones go to the first missing step or Home.
export default function App() {
  const route = useRoute();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const status = useQuery(api.setup.status, isAuthenticated ? {} : 'skip');

  // A sign-in that's finished no longer needs its saved details, unless the name step still uses them.
  useEffect(() => {
    if (status && status.nextStep !== 'name' && readPending()) clearPending();
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
  if (status.nextStep === 'name') return <FinishName />;

  switch (route) {
    case 'home': return <Home status={status} />;
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
