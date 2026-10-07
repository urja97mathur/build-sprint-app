// Use the existing browser tools on this computer; no browser download is needed.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/urjamathur/Library/Caches/ms-playwright-go/1.50.1/package');
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.setDefaultTimeout(10000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const base = process.env.CHECK_URL || 'http://localhost:5173';
await mkdir('artifacts', { recursive: true });
try {
  await page.goto(base);
  await page.getByText('Open your private test link to use this demo.').waitFor();
  assert.equal(await page.getByRole('button', { name: 'Call me', exact: true }).isDisabled(), true);
  await page.screenshot({ path: 'artifacts/call-test-phone.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  // Stub only provider outcomes for UI checks; never place calls from this script.
  let callCount = 0;
  await page.route('**/api/call-setup', route => route.fulfill({ json: { ready: true } }));
  await page.route('**/api/call', route => { callCount++; return route.fulfill({ json: { requested: true } }); });
  await page.goto(`${base}/?check=ready#access=ui-test-access`);
  await page.getByText('Ready when you are.').waitFor();
  await page.getByRole('button', { name: 'Call me', exact: true }).click();
  await page.getByText('Call requested. Answer when your phone rings. This doesn’t confirm the call connected.').waitFor();
  assert.equal(callCount, 1);
  assert.equal(await page.getByRole('button', { name: 'Call requested', exact: true }).isDisabled(), true);
  await page.reload();
  await page.getByText('A call was already requested in this tab.', { exact: false }).waitFor();
  assert.equal(callCount, 1);
  await page.evaluate(() => sessionStorage.clear());
  await page.route('**/api/call', route => route.fulfill({ status: 504, json: { uncertain: true, message: 'Unconfirmed' } }));
  await page.goto(`${base}/?check=uncertain#access=ui-test-access`);
  await page.getByText('Ready when you are.').waitFor();
  await page.getByRole('button', { name: 'Call me', exact: true }).click();
  await page.getByText('We couldn’t confirm the call request.', { exact: false }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Check your phone', exact: true }).isDisabled(), true);
  assert.deepEqual(errors, []);
  console.log('Phone-width page checked: private access, request confirmation, refresh guard, uncertainty, no overflow or browser errors. Call outcomes were simulated; no real phone call placed.');
} finally { await browser.close(); }
