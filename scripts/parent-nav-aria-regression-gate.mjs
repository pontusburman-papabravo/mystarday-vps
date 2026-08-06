#!/usr/bin/env node
/**
 * RC-1 R3 — Parent bottom nav aria-label regression (en-GB + sv-SE).
 * Locks: static HTML nav, dynamic create, locale change, parent-i18n-ready, single nav.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const EN_ARIA = 'Main navigation';
const SV_ARIA = 'Huvudnavigering';

function puppeteerCookies(jar, baseUrl) {
  const host = new URL(baseUrl).hostname;
  return Object.entries(jar).map(([name, value]) => ({
    name, value, domain: host, path: '/',
  }));
}

async function registerParent(BASE, { email, password, preferred_locale }) {
  const reg = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      name: 'Parent',
      preferred_locale,
      country_code: 'SE',
    }),
  });
  if (reg.status !== 201) throw new Error(`register_${reg.status}`);
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (loginRes.status !== 200) throw new Error(`login_${loginRes.status}`);
  const loginBody = await loginRes.json();
  const { mergeCookies, getSetCookieHeaders } = require(path.join(ROOT, 'test/helpers/http.js'));
  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return { cookies, csrfToken: loginBody.csrfToken };
}

async function waitForNavAria(page, expected, timeout = 60000) {
  await page.waitForFunction(
    (exp) => document.querySelector('#parentBottomNav')?.getAttribute('aria-label') === exp,
    { timeout },
    expected,
  );
}

async function waitForPtMainAria(page, expected, timeout = 90000) {
  await page.waitForFunction(
    (exp) => typeof window.pt === 'function' && window.pt('nav.mainAria') === exp,
    { timeout },
    expected,
  );
}

async function bootDailyLog(page, BASE, childId) {
  await page.goto(`${BASE}/daily-log?childId=${encodeURIComponent(childId)}`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
}

async function shellRefresh(page) {
  await page.evaluate(async () => {
    if (window.ParentMagicShell?.init) {
      await window.ParentMagicShell.init('daily-log');
    }
    if (window.ParentMagicShell?.refresh) {
      window.ParentMagicShell.refresh();
    }
  });
}

export async function runParentNavAriaRegression({ BASE, cookies, childId, page }) {
  // Parent bottom nav is not re-created when native tab bar mode hides #parentBottomNav (mobile WebView).
  await page.setViewport({ width: 1280, height: 900, isMobile: false });
  const regression = {
    staticNavEnGb: false,
    dynamicNavEnGb: false,
    localeChangeUpdates: false,
    singleNav: false,
    parentI18nReadyRefresh: false,
    parentI18nReadyEvent: false,
  };

  await bootDailyLog(page, BASE, childId);
  try {
    await waitForPtMainAria(page, EN_ARIA);
  } catch (e) {
    e.step = 'waitPtEnGb';
    throw e;
  }
  await shellRefresh(page);
  try {
    await waitForNavAria(page, EN_ARIA, 30000);
  } catch (e) {
    e.step = 'staticNavEnGb';
    throw e;
  }
  regression.staticNavEnGb = await page.evaluate(
    (exp) => document.querySelector('#parentBottomNav')?.getAttribute('aria-label') === exp,
    EN_ARIA,
  );

  await page.evaluate(() => {
    document.getElementById('parentBottomNav')?.remove();
  });
  await shellRefresh(page);
  try {
    await page.waitForFunction(
      () => document.querySelectorAll('#parentBottomNav').length === 1,
      { timeout: 10000 },
    );
  } catch {
    await shellRefresh(page);
  }
  const dynamic = await page.evaluate((exp) => {
    const nodes = document.querySelectorAll('#parentBottomNav');
    const aria = nodes[0]?.getAttribute('aria-label') || '';
    return { created: nodes.length === 1, aria, count: nodes.length, exp };
  }, EN_ARIA);
  regression.dynamicNavEnGb = dynamic.created && dynamic.aria === EN_ARIA;
  regression.singleNav = dynamic.count === 1;
  if (!regression.dynamicNavEnGb) {
    regression.dynamicDebug = dynamic;
  }

  const afterStaleRefresh = await page.evaluate(() => {
    const nav = document.getElementById('parentBottomNav');
    if (nav) nav.setAttribute('aria-label', 'stale-wrong-label');
    return nav?.getAttribute('aria-label') || '';
  });
  await shellRefresh(page);
  const ariaAfterStale = await page.evaluate(
    (exp) => document.querySelector('#parentBottomNav')?.getAttribute('aria-label') || '',
    EN_ARIA,
  );
  regression.parentI18nReadyRefresh = ariaAfterStale === EN_ARIA;

  await page.evaluate(() => {
    const nav = document.getElementById('parentBottomNav');
    if (nav) nav.setAttribute('aria-label', 'stale-wrong-label');
    document.dispatchEvent(new CustomEvent('parent-i18n-ready', { detail: { lang: 'en-GB' } }));
  });
  const afterI18nEvent = await page.evaluate(
    (exp) => document.querySelector('#parentBottomNav')?.getAttribute('aria-label') || '',
    EN_ARIA,
  );
  regression.parentI18nReadyEvent = afterI18nEvent === EN_ARIA;

  await page.evaluate(async () => {
    if (typeof window.initParentAppI18n === 'function') {
      await window.initParentAppI18n('sv-SE');
    }
  });
  await shellRefresh(page);
  const localeSvAfter = await page.evaluate((exp) => ({
    pt: typeof window.pt === 'function' ? window.pt('nav.mainAria') : '',
    aria: document.querySelector('#parentBottomNav')?.getAttribute('aria-label') || '',
    exp,
  }), SV_ARIA);
  regression.localeChangeUpdates = localeSvAfter.pt === SV_ARIA && localeSvAfter.aria === SV_ARIA;

  const enPass = [
    'staticNavEnGb',
    'dynamicNavEnGb',
    'localeChangeUpdates',
    'singleNav',
    'parentI18nReadyRefresh',
    'parentI18nReadyEvent',
  ].every((k) => regression[k]);
  return { regression, pass: enPass };
}

async function main() {
  const puppeteer = await import('puppeteer').then((m) => m.default).catch(() => null);
  if (!puppeteer) {
    console.log(JSON.stringify({ pass: false, error: 'puppeteer_missing' }));
    process.exit(2);
  }

  process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
  }

  const { setupTestDb } = require(path.join(ROOT, 'test/helpers/setup.js'));
  const { listenApp } = require(path.join(ROOT, 'test/helpers/http.js'));
  const { createChild } = require(path.join(ROOT, 'test/helpers/auth-session.js'));

  const testDb = await setupTestDb();
  if (testDb.skip) {
    console.log(JSON.stringify({ pass: false, error: 'no_database' }));
    process.exit(2);
  }

  const { createApp } = require(path.join(ROOT, 'app.js'));
  const http = await listenApp(createApp);
  const BASE = http.baseUrl;

  try {
    await testDb.query(
      `INSERT INTO app_config (key, value) VALUES ('english_app_global_enabled', 'true')
       ON CONFLICT (key) DO UPDATE SET value = 'true'`,
    );
    const password = 'integration-test-pass-1';
    const email = `nav-aria-reg-${Date.now()}@example.com`;
    const { cookies, csrfToken } = await registerParent(BASE, {
      email,
      password,
      preferred_locale: 'en-GB',
    });
    await testDb.query(
      'UPDATE parent SET onboarding_completed = true WHERE lower(email) = lower($1)',
      [email],
    );
    const childId = await createChild(BASE, { cookies, csrfToken });

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900, isMobile: false });
    for (const c of puppeteerCookies(cookies, BASE)) await page.setCookie(c);

    const { regression, pass: enPass } = await runParentNavAriaRegression({
      BASE,
      cookies,
      childId,
      page,
    });

    const svEmail = `nav-aria-sv-${Date.now()}@example.com`;
    const svSession = await registerParent(BASE, {
      email: svEmail,
      password,
      preferred_locale: 'sv-SE',
    });
    await testDb.query(
      'UPDATE parent SET onboarding_completed = true WHERE lower(email) = lower($1)',
      [svEmail],
    );
    const svChildId = await createChild(BASE, { cookies: svSession.cookies, csrfToken: svSession.csrfToken });
    const svPage = await browser.newPage();
    await svPage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    for (const c of puppeteerCookies(svSession.cookies, BASE)) await svPage.setCookie(c);
    await bootDailyLog(svPage, BASE, svChildId);
    await waitForPtMainAria(svPage, SV_ARIA);
    await shellRefresh(svPage);
    const svMetrics = await svPage.evaluate((exp) => ({
      pt: typeof window.pt === 'function' ? window.pt('nav.mainAria') : '',
      aria: document.querySelector('#parentBottomNav')?.getAttribute('aria-label') || '',
      exp,
    }), SV_ARIA);
    regression.svSeKeepsSwedish = svMetrics.pt === SV_ARIA && svMetrics.aria === SV_ARIA;
    await svPage.close();

    await browser.close();
    await http.close();
    await testDb.cleanup();
    try {
      const db = require(path.join(ROOT, 'src/lib/db'));
      await db.pool.end();
    } catch { /* ignore */ }

    const pass = enPass && Object.values(regression).every(Boolean);
    const report = { step: 'parent-nav-aria-regression-gate', regression, pass };
    console.log(JSON.stringify(report, null, 2));
    process.exit(pass ? 0 : 1);
  } catch (e) {
    console.log(JSON.stringify({ pass: false, error: e.message, step: e.step || 'unknown', regression: e.regression }));
    try { await http.close(); } catch { /* ignore */ }
    try { await testDb.cleanup(); } catch { /* ignore */ }
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
