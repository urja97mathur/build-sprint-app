import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConvexReactClient } from 'convex/react';
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import App from './App.jsx';
import '../ui.css';

// Only the public Convex address enters the bundle. On the hosted site it's derived from the page's own address.
const url = import.meta.env.VITE_CONVEX_URL ?? location.origin.replace(/\.convex\.site$/, '.convex.cloud');
const client = new ConvexReactClient(url);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConvexAuthProvider client={client} shouldHandleCode={false}>
      <App />
    </ConvexAuthProvider>
  </StrictMode>,
);
