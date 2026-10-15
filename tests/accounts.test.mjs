import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrUpdateUser } from '../convex/lib/accounts.js';

// A tiny stand-in for the users table: enough of ctx.db for createOrUpdateUser.
function fakeDb(users = []) {
  const rows = new Map(users.map(user => [user._id, { ...user }]));
  let next = rows.size + 1;
  return {
    rows,
    db: {
      query: () => ({ withIndex: (_name, range) => {
        let email;
        range({ eq: (_field, value) => { email = value; } });
        return { collect: async () => [...rows.values()].filter(user => user.email === email) };
      } }),
      get: async id => rows.get(id) ?? null,
      patch: async (id, fields) => { rows.set(id, { ...rows.get(id), ...fields }); },
      insert: async (_table, fields) => { const id = `user${next++}`; rows.set(id, { _id: id, ...fields }); return id; },
    },
  };
}
const NOW = 1_760_000_000_000;
const email = { id: 'email', type: 'email' };
const google = { id: 'google', type: 'oidc' };
const run = (db, args) => createOrUpdateUser({ db }, args, NOW);

test('a new Google sign-in creates an account with her Google name and email, verified, and no photo', async () => {
  const { db, rows } = fakeDb();
  const id = await run(db, { existingUserId: null, provider: google, profile: { name: 'Urja Mathur', email: 'u@example.com', emailVerified: true } });
  assert.deepEqual(rows.get(id), { _id: id, name: 'Urja Mathur', email: 'u@example.com', emailVerificationTime: NOW });
});

test('Google with the email of an existing verified account joins it and keeps the name she saved', async () => {
  const { db, rows } = fakeDb([{ _id: 'urja', name: 'Urja', email: 'u@example.com', emailVerificationTime: 1, phone: '+919000000000' }]);
  const id = await run(db, { existingUserId: null, provider: google, profile: { name: 'Urja Mathur', email: 'u@example.com', emailVerified: true } });
  assert.equal(id, 'urja');
  assert.equal(rows.size, 1);
  assert.equal(rows.get('urja').name, 'Urja');
  assert.equal(rows.get('urja').phone, '+919000000000');
});

test('Google fills in a name only if the account has none', async () => {
  const { db, rows } = fakeDb([{ _id: 'urja', email: 'u@example.com', emailVerificationTime: 1 }]);
  await run(db, { existingUserId: null, provider: google, profile: { name: 'Urja Mathur', email: 'u@example.com', emailVerified: true } });
  assert.equal(rows.get('urja').name, 'Urja Mathur');
});

test('a Google email Google hasn’t verified never joins an existing account', async () => {
  const { db, rows } = fakeDb([{ _id: 'urja', name: 'Urja', email: 'u@example.com', emailVerificationTime: 1 }]);
  const id = await run(db, { existingUserId: null, provider: google, profile: { name: 'Someone', email: 'u@example.com', emailVerified: false } });
  assert.notEqual(id, 'urja');
  assert.equal(rows.get('urja').name, 'Urja');
  assert.equal(rows.get(id).emailVerificationTime, undefined);
});

test('email codes work as before: asking for a code finds or creates the account; the right code verifies it', async () => {
  const { db, rows } = fakeDb();
  const id = await run(db, { existingUserId: null, provider: email, profile: { email: 'new@example.com' } });
  assert.deepEqual(rows.get(id), { _id: id, email: 'new@example.com' });
  await run(db, { existingUserId: id, provider: email, profile: { email: 'new@example.com', emailVerified: true } });
  assert.equal(rows.get(id).emailVerificationTime, NOW);
});

test('an email code for an address that signed up with Google joins that account', async () => {
  const { db, rows } = fakeDb([{ _id: 'g', name: 'Urja Mathur', email: 'u@example.com', emailVerificationTime: 1 }]);
  assert.equal(await run(db, { existingUserId: null, provider: email, profile: { email: 'u@example.com' } }), 'g');
  assert.equal(rows.size, 1);
  assert.equal(rows.get('g').name, 'Urja Mathur');
});

test('a returning sign-in to a linked account stays on it', async () => {
  const { db, rows } = fakeDb([{ _id: 'urja', name: 'Urja', email: 'u@example.com', emailVerificationTime: 1 }]);
  assert.equal(await run(db, { existingUserId: 'urja', provider: google, profile: { name: 'Urja M', email: 'u@example.com', emailVerified: true } }), 'urja');
  assert.equal(rows.get('urja').name, 'Urja');
});

test('two verified accounts with the same email: no guessing, a new account instead', async () => {
  const { db, rows } = fakeDb([
    { _id: 'a', email: 'u@example.com', emailVerificationTime: 1 },
    { _id: 'b', email: 'u@example.com', emailVerificationTime: 2 },
  ]);
  const id = await run(db, { existingUserId: null, provider: google, profile: { name: 'U', email: 'u@example.com', emailVerified: true } });
  assert.ok(!['a', 'b'].includes(id));
  assert.equal(rows.size, 3);
});
