import test from 'node:test';
import assert from 'node:assert/strict';
import { normalisePhone } from '../convex/lib/phone.js';
import { newLoginCode, sendLoginCode, CODE_MINUTES } from '../convex/lib/email.js';
import { cleanName, cleanPhrase, nextStep } from '../convex/lib/setup.js';
import { phraseMatches, similarity } from '../src/app/practice.js';
import authConfig from '../convex/auth.config.js';

test('trusted-contact numbers: Indian numbers with or without +91; other countries need their + code', () => {
  for (const input of ['9876543210', '+91 98765 43210', '919876543210', '098765-43210', '(+91) 98765.43210', '0091 9876543210']) {
    assert.equal(normalisePhone(input), '+919876543210');
  }
  assert.equal(normalisePhone('+44 7700 900123'), '+447700900123');
  assert.equal(normalisePhone('+1 (415) 555-0100'), '+14155550100');
  for (const input of ['12345', '5876543210', '+91 5876543210', '+91 98765', '4155550100', '', undefined, 'call me']) {
    assert.equal(normalisePhone(input), null, String(input));
  }
});

test('sign-in codes are six random digits', () => {
  const codes = new Set(Array.from({ length: 200 }, newLoginCode));
  for (const code of codes) assert.match(code, /^\d{6}$/);
  assert.ok(codes.size > 190);
});

test('the code email goes to Resend with the key in a header, and refusals log the status only', async t => {
  const env = { AUTH_RESEND_KEY: 're_fake_key' };
  let sent;
  await sendLoginCode('her@example.com', '123456', env, async (url, options) => {
    sent = { url, options, body: JSON.parse(options.body) };
    return Response.json({ id: 'email-id' });
  });
  assert.equal(sent.url, 'https://api.resend.com/emails');
  assert.equal(sent.options.headers.Authorization, 'Bearer re_fake_key');
  assert.deepEqual(sent.body.to, ['her@example.com']);
  assert.match(sent.body.subject, /^123456 /);
  assert.match(sent.body.text, new RegExp(`expires in ${CODE_MINUTES} minutes`));
  assert.equal(sent.body.from, 'Walking companion <onboarding@resend.dev>');

  const logged = t.mock.method(console, 'error', () => {});
  await assert.rejects(
    sendLoginCode('her@example.com', '654321', env, async () => Response.json({ message: 'secret detail' }, { status: 403 })),
    error => !/654321|her@example|secret|re_fake/.test(error.message),
  );
  assert.match(logged.mock.calls[0].arguments[0], /403/);
  assert.doesNotMatch(logged.mock.calls[0].arguments[0], /654321|her@example|secret|re_fake/);
  await assert.rejects(sendLoginCode('her@example.com', '1', {}, () => assert.fail('must not call Resend')));
});

test('setup steps come in DESIGN.md order: name, trusted contact, code word', () => {
  assert.equal(nextStep({ name: null, contacts: 0, codeWordSaved: false }), 'name');
  assert.equal(nextStep({ name: 'Urja', contacts: 0, codeWordSaved: false }), 'contact');
  assert.equal(nextStep({ name: 'Urja', contacts: 1, codeWordSaved: false }), 'codeword');
  assert.equal(nextStep({ name: 'Urja', contacts: 2, codeWordSaved: true }), null);
  assert.equal(cleanName('  Urja   Mathur '), 'Urja Mathur');
  assert.equal(cleanName('   '), null);
  assert.equal(cleanName('x'.repeat(81)), null);
  assert.equal(cleanPhrase(' Did you  feed Bruno? '), 'Did you feed Bruno?');
  assert.equal(cleanPhrase('ab'), null);
  assert.equal(cleanPhrase('x'.repeat(61)), null);
});

test('practice matches the phrase despite capitals, punctuation, extra words and Hinglish spellings', () => {
  assert.ok(phraseMatches('Did you feed Bruno?', 'did you feed bruno'));
  assert.ok(phraseMatches('Did you feed Bruno?', 'hey did you feed Bruno yet'));
  assert.ok(phraseMatches('Tulsi mein paani daala?', 'tulsi main pani dala'));
  assert.ok(phraseMatches('Meera aunty aa gayi?', 'Mira aunty aa gai'));
  assert.ok(!phraseMatches('Did you feed Bruno?', 'what time is it'));
  assert.ok(!phraseMatches('Did you feed Bruno?', ''));
  assert.ok(!phraseMatches('Tulsi mein paani daala?', 'I am walking home now'));
  assert.ok(similarity('Did you feed Bruno?', 'did you need bruno') < 1);
});

test('sign-in tokens are checked against this site’s own Convex Auth keys', () => {
  const [provider] = authConfig.providers;
  assert.equal(provider.domain, process.env.CONVEX_SITE_URL);
  assert.equal(provider.applicationID, 'convex');
});
