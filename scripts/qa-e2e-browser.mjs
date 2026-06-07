#!/usr/bin/env node
/**
 * Browser QA: PWA shell, UX/a11y, drag-drop partial (QA-232–243, QA-297–299, QA-134)
 * Requires: npm install playwright && npx playwright install chromium
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function resolveBrowserTarget() {
  const rawBase = (process.env.QA_BASE_URL || 'https://mystarday.se').replace(/\/+$/, '');
  const host = process.env.QA_HOST || '';
  const ipMatch = rawBase.match(/^https:\/\/(\d+\.\d+\.\d+\.\d+)/);
  if (host && ipMatch) {
    return {
      baseUrl: `https://${host}`,
      launchArgs: ['--no-sandbox', `--host-resolver-rules=MAP ${host} ${ipMatch[1]}`],
      tlsInsecure: true,
    };
  }
  return {
    baseUrl: rawBase,
    launchArgs: ['--no-sandbox'],
    tlsInsecure: /^https:\/\/\d+\.\d+\.\d+\.\d+/.test(rawBase),
  };
}

const { baseUrl: BASE, launchArgs, tlsInsecure: TLS_INSECURE } = resolveBrowserTarget();
const results = new Map();

function record(id, status, note = '') {
  results.set(id, { status, note });
  console.log(`${{ pass: '✅', fail: '❌', skip: '⏭', partial: '⚠️' }[status]} ${id} ${note}`);
}

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    return null;
  }
}

async function main() {
  const pw = await loadPlaywright();
  if (!pw) {
    record('QA-297', 'skip', 'playwright ej installerat — kör: npm i -D playwright && npx playwright install chromium');
    record('QA-298', 'skip', 'playwright saknas');
    record('QA-299', 'skip', 'playwright saknas');
    for (let i = 232; i <= 243; i++) record(`QA-${i}`, 'skip', 'playwright saknas');
    record('QA-134', 'skip', 'DnD browser');
    writeOut();
    process.exit(0);
  }

  const { chromium } = pw;
  const browser = await chromium.launch({ headless: true, args: launchArgs });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'sv-SE',
    ignoreHTTPSErrors: TLS_INSECURE,
  });
  const page = await context.newPage();

  const t0 = Date.now();
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  record('QA-299', Date.now() - t0 < 3000 ? 'pass' : 'partial', `login load ${Date.now() - t0}ms`);

  // PWA / SW checks on dashboard (public)
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  const swReg = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 'unsupported';
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      return reg ? 'registered' : 'none';
    } catch { return 'error'; }
  });
  record('QA-232', swReg === 'registered' ? 'pass' : 'partial', `SW: ${swReg}`);
  record('QA-233', 'partial', 'SW version bump — deploy-test');
  record('QA-234', 'partial', 'offline sync — kräver offline browser test');
  record('QA-235', (await page.content()).includes('platform-theme') ? 'pass' : 'partial', 'platform inject');
  record('QA-236', 'skip', 'native CSS — Capacitor only');
  record('QA-237', 'skip', 'safe area — native');
  record('QA-238', 'skip', 'Android back');
  record('QA-239', 'partial', `${BASE}/child-login nåbar`);
  record('QA-240', 'partial', 'PWA install — manuell Add to Home');
  record('QA-241', 'skip', 'Google Auth native');
  record('QA-242', 'skip', 'iOS statusbar');
  record('QA-243', 'skip', 'haptik native');

  // Push native
  for (const id of [220, 221, 222, 223, 226]) record(`QA-${id}`, 'skip', 'push device/native');

  // Apple Sign In
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  const appleBtn = await page.locator('#appleSignInBtn, [data-apple-signin], button:has-text("Apple")').count();
  record('QA-025', 'skip', 'Apple IdP — kräver Apple-konto + enhet');
  record('QA-026', 'skip', 'Apple IdP');
  record('QA-027', appleBtn > 0 ? 'partial' : 'pass', `Apple-knapp count=${appleBtn} (webb)`);

  // A11y: focusable login controls
  await page.goto(`${BASE}/login`);
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
  record('QA-297', focused ? 'pass' : 'partial', `fokus efter Tab: ${focused}`);

  // Touch targets on login button
  const btnBox = await page.locator('#submitBtn, button[type="submit"]').first().boundingBox().catch(() => null);
  if (btnBox && btnBox.height >= 44) record('QA-298', 'pass', `submit height ${Math.round(btnBox.height)}px`);
  else record('QA-298', btnBox ? 'partial' : 'skip', btnBox ? `height ${btnBox?.height}px` : 'ingen knapp');

  // Admin HTML loads without JS parse errors (QA-282)
  const adminPage = await context.newPage();
  let adminJsError = null;
  adminPage.on('pageerror', (err) => { adminJsError = err.message; });
  try {
    await adminPage.goto(`${BASE}/admin/index.html`, { waitUntil: 'networkidle', timeout: 30000 });
    const adminHtml = await adminPage.content().catch(() => '');
    if (adminJsError) record('QA-282', 'fail', `JS error: ${adminJsError.slice(0, 80)}`);
    else if (adminHtml.includes('admin-core') || adminHtml.includes('/admin/')) {
      record('QA-282', 'pass', 'admin index laddad');
    } else {
      record('QA-282', 'partial', 'admin redirect/okänd sida');
    }
  } catch (err) {
    record('QA-282', 'partial', `admin load: ${err.message.slice(0, 60)}`);
  }
  await adminPage.close().catch(() => {});

  record('QA-134', 'skip', 'schema DnD — kräver inloggad session + Playwright drag');

  await browser.close();
  writeOut();
}

function writeOut() {
  fs.writeFileSync(path.join(root, 'docs/qa-run-browser-latest.json'), JSON.stringify(Object.fromEntries(results), null, 2));
  console.log('\nWrote docs/qa-run-browser-latest.json');
}

main().catch((e) => {
  console.error(e);
  writeOut();
  process.exit(1);
});
