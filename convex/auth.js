import { convexAuth } from '@convex-dev/auth/server';
import { Email } from '@convex-dev/auth/providers/Email';
import Google from '@auth/core/providers/google';
import { CODE_MINUTES, newLoginCode, sendLoginCode } from './lib/email.js';
import { createOrUpdateUser } from './lib/accounts.js';

// Sign-in with a six-digit code sent to her email (Convex Auth allows 10 wrong codes an hour per email), or with
// her Google account (AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET in the Convex settings). From Google we keep only her
// name and email, never her photo. Which account a sign-in joins: lib/accounts.js.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Email({
      id: 'email',
      maxAge: CODE_MINUTES * 60,
      generateVerificationToken: newLoginCode,
      sendVerificationRequest: ({ identifier, token }) => sendLoginCode(identifier, token, process.env),
    }),
    // Google always shows "Choose an account", even when only one account is on her phone.
    Google({
      authorization: { params: { prompt: 'select_account' } },
      profile: google => ({ id: google.sub, name: google.name, email: google.email, emailVerified: google.email_verified === true }),
    }),
  ],
  callbacks: { createOrUpdateUser: (ctx, args) => createOrUpdateUser(ctx, args) },
});
