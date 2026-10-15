// Which account a sign-in belongs to, and what it saves on it: Convex Auth's default rule, except that a name she
// already saved is kept (signing in with Google later doesn't replace it with her Google name). Used as the
// `createOrUpdateUser` callback in convex/auth.js.
//
// Email-code sign-ins may join an existing account with the same verified email (she proves the address by
// entering the code); Google sign-ins may when Google says the email is verified. The verification flags aren't
// saved; the time the email was verified is.
export async function createOrUpdateUser(ctx, { existingUserId, provider, profile }, now = Date.now()) {
  const { emailVerified, phoneVerified, ...fields } = profile;
  const oauth = provider.type === 'oauth' || provider.type === 'oidc';
  const verified = emailVerified ?? (oauth && provider.allowDangerousEmailAccountLinking !== false);
  if (verified) fields.emailVerificationTime = now;

  let userId = existingUserId;
  if (!userId && typeof profile.email === 'string' && (verified || provider.type === 'email')) {
    const sameEmail = await ctx.db.query('users').withIndex('email', q => q.eq('email', profile.email)).collect();
    const verifiedUsers = sameEmail.filter(user => user.emailVerificationTime !== undefined);
    if (verifiedUsers.length === 1) userId = verifiedUsers[0]._id;
  }
  if (!userId) return ctx.db.insert('users', fields);
  const user = await ctx.db.get(userId);
  const { name, ...rest } = fields;
  await ctx.db.patch(userId, user?.name || name === undefined ? rest : fields);
  return userId;
}
