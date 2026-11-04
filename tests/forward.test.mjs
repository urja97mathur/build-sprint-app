import test from 'node:test';
import assert from 'node:assert/strict';
import { OLD_PAGES, forwardToSite } from '../convex/lib/forward.js';

const ENV = { SITE_URL: 'https://companion.example/' };
const open = path => new Request(`https://old.convex.site${path}`);

test('an old page forwards to the same page on the new address', () => {
  for (const path of OLD_PAGES) {
    const response = forwardToSite(open(path), ENV);
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('Location'), `https://companion.example${path}`);
  }
});

test('the rest of the old link comes along', () => {
  assert.equal(forwardToSite(open('/?code=abc'), ENV).headers.get('Location'), 'https://companion.example/?code=abc');
});

test('without a new address set, nothing is forwarded', () => {
  assert.equal(forwardToSite(open('/'), {}).status, 404);
  assert.equal(forwardToSite(open('/'), { SITE_URL: ' ' }).status, 404);
});
