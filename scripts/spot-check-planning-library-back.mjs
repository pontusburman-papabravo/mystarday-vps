/**
 * Release spot-check: Planering → Bibliotek → tillbaka
 */
import puppeteer from 'puppeteer';
import { resolvePlatformCredentials } from './lib/qa-test-accounts.mjs';

const BASE = 'http://127.0.0.1:3000';
const platform = resolvePlatformCredentials();
const EMAIL = platform.email;
const PASSWORD = platform.password;

let jar = '';
function absorb(res) {
  (res.headers.getSetCookie ? res.headers.getSetCookie() : []).forEach((line) => {
    const part = line.split(';')[0];
    const i = part.indexOf('=');
    if (i > 0) {
      if (jar) jar += '; ';
      jar += part.slice(0, i) + '=' + part.slice(i + 1);
    }
  });
}
async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (jar) headers.cookie = jar;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  absorb(res);
  return res;
}

async function main() {
  await api('/api/auth/csrf-token');
  let login = await api('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!login.ok) {
    await api('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Platform QA', email: EMAIL, password: PASSWORD, termsAccepted: true }),
    });
    await api('/api/auth/csrf-token');
    login = await api('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
  }
  if (!login.ok) throw new Error('login failed: ' + login.status);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 667, isMobile: true });
  const cookies = jar.split('; ').map((pair) => {
    const i = pair.indexOf('=');
    return { name: pair.slice(0, i), value: pair.slice(i + 1), url: BASE };
  });
  await page.setCookie(...cookies);
  await page.goto(`${BASE}/planning`, { waitUntil: 'domcontentloaded' });
  const me = await (await api('/api/auth/me')).json();
  await page.evaluate((u) => localStorage.setItem('stjarndag_user', JSON.stringify(u)), me);

  await page.waitForSelector('[data-hub-link="Bibliotek"]', { timeout: 15000 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }),
    page.click('[data-hub-link="Bibliotek"]'),
  ]);
  await page.waitForSelector('#libraryMagicHubMount, .library-magic-hub', { timeout: 15000 }).catch(() => null);
  await page.waitForFunction(
    () => sessionStorage.getItem('libFromPlanning') === '1',
    { timeout: 5000 },
  );
  try {
    await page.waitForFunction(
      () => {
        const mount = document.getElementById('libraryMagicHubMount');
        return mount && !mount.classList.contains('hidden') &&
          !!mount.querySelector('[data-library-planning-back]');
      },
      { timeout: 30000 },
    );
  } catch (_) {
    await new Promise((r) => setTimeout(r, 2000));
  }

  const check = await page.evaluate(() => ({
    url: location.pathname,
    libFromPlanning: sessionStorage.getItem('libFromPlanning'),
    planFromPlanning: sessionStorage.getItem('planFromPlanning'),
    hasBack: !!document.querySelector('[data-library-planning-back]'),
    backText: document.querySelector('[data-library-planning-back]')?.textContent?.trim() || null,
    hubMountVisible: !document.getElementById('libraryMagicHubMount')?.classList.contains('hidden'),
    hubHtml: (document.getElementById('libraryMagicHubMount')?.innerHTML || '').slice(0, 200),
    isMagic: !!(window.AppViewMode && AppViewMode.isAllowed && AppViewMode.isAllowed() && AppViewMode.isMagic && AppViewMode.isMagic()),
    bodyClass: document.body.className,
  }));

  let backOk = false;
  if (check.hasBack) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }),
      page.click('[data-library-planning-back]'),
    ]).catch(() => null);
    backOk = page.url().includes('/planning');
  }

  console.log(JSON.stringify({ check, backOk, finalUrl: page.url().replace(BASE, '') }, null, 2));
  await browser.close();
  if (!check.url.includes('/library') || !check.hasBack || !backOk) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
