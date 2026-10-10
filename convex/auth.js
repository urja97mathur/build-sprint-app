import { convexAuth } from '@convex-dev/auth/server';
import { Email } from '@convex-dev/auth/providers/Email';
import { CODE_MINUTES, newLoginCode, sendLoginCode } from './lib/email.js';

// Sign-in with a six-digit code sent to her email. Convex Auth allows 10 wrong codes an hour per email.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Email({
      id: 'email',
      maxAge: CODE_MINUTES * 60,
      generateVerificationToken: newLoginCode,
      sendVerificationRequest: ({ identifier, token }) => sendLoginCode(identifier, token, process.env),
    }),
  ],
});
