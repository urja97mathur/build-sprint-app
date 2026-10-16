import { convexAuth } from '@convex-dev/auth/server';
import Google from '@auth/core/providers/google';
import { createOrUpdateUser } from './lib/accounts.js';

// Sign-in with her Google account only (decided 2026-10-16; email codes are parked). AUTH_GOOGLE_ID and
// AUTH_GOOGLE_SECRET are in the Convex settings. From Google we keep only her name and email, never her photo.
// Which account a sign-in joins: lib/accounts.js.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    // Google always shows "Choose an account", even when only one account is on her phone.
    Google({
      authorization: { params: { prompt: 'select_account' } },
      profile: google => ({ id: google.sub, name: google.name, email: google.email, emailVerified: google.email_verified === true }),
    }),
  ],
  callbacks: { createOrUpdateUser: (ctx, args) => createOrUpdateUser(ctx, args) },
});
