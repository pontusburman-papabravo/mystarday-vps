#!/usr/bin/env node
/**
 * R2 — activity timer setup clarity (library bridge + child API).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const VIEWPORTS = [
  { name: 'iphone-390x844', width: 390, height: 844 },
  { name: 'android-412x915', width: 412, height: 915 },
];

function cookieString(cookies) {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function runViewport(puppeteer, baseUrl, session, ctx, viewport) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const consoleErrors = [];
  const http5xx = [];
  page.on('pageerror', (e) => consoleErrors.push(String(e.message || e)));
  page.on('response', (res) => {
    if (res.status() >= 500 && res.url().includes('/api/')) http5xx.push(res.status());
  });

  const host = new URL(baseUrl).hostname;
  for (const [name, value] of Object.entries(session.cookies)) {
    await page.setCookie({ name, value, domain: host, path: '/' });
  }

  await page.goto(`${baseUrl}/library`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 3500));
  if (!page.url().includes('/library')) {
    throw new Error('library auth failed: ' + page.url());
  }

  const opened = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => /Ny aktivitet/i.test(b.textContent || ''));
    if (btn) { btn.click(); return true; }
    if (typeof openActivityModal === 'function') { openActivityModal(null); return true; }
    return false;
  });
  if (!opened) throw new Error('could not open activity modal');
  await page.waitForSelector('#activityModal:not(.hidden)', { timeout: 15000 });

  await page.click('.activity-timer-preset-btn[data-seconds="120"]');
  await new Promise((r) => setTimeout(r, 800));

  const bridgeBefore = await page.evaluate(() => {
    const el = document.getElementById('activityTimerMasterBridge');
    return {
      visible: el && !el.classList.contains('hidden'),
      text: el ? el.textContent : '',
      hasCta: !!(el && el.querySelector('.activity-timer-bridge-enable')),
    };
  });

  let enableWrites = 0;
  page.on('request', (req) => {
    if (req.method() === 'PUT' && req.url().includes('/api/children/') && req.postData()?.includes('activity_timers_enabled')) {
      enableWrites += 1;
    }
  });

  await page.click('.activity-timer-bridge-enable');
  await new Promise((r) => setTimeout(r, 1500));

  const bridgeAfter = await page.evaluate(() => {
    const el = document.getElementById('activityTimerMasterBridge');
    return {
      visible: el && !el.classList.contains('hidden'),
      hasCta: !!(el && el.querySelector('.activity-timer-bridge-enable')),
    };
  });

  const childApiOff = await fetch(`${baseUrl}/api/me/daily-log?date=${ctx.dateStr}`, {
    headers: { Cookie: cookieString(ctx.childCookies) },
  });
  const childBodyOff = childApiOff.ok ? await childApiOff.json() : {};

  await browser.close();

  const pass = bridgeBefore.visible
    && bridgeBefore.hasCta
    && /Aktivitetstimern är av/i.test(bridgeBefore.text)
    && enableWrites === 1
    && !bridgeAfter.hasCta
    && childBodyOff.activity_timer_v2 === true
    && http5xx.length === 0
    && consoleErrors.length === 0;

  return {
    viewport: viewport.name,
    pass,
    bridgeBefore,
    bridgeAfter,
    enableWrites,
    childTimerV2: childBodyOff.activity_timer_v2,
    http5xx,
    consoleErrors,
  };
}

async function main() {
  const puppeteer = await import('puppeteer').then((m) => m.default).catch(() => null);
  if (!puppeteer) process.exit(2);

  process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
  process.env.RATE_LIMIT_ENABLED = 'false';
  process.env.EMAIL_ENABLED = 'false';
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
  }

  const { createApp } = require(path.join(ROOT, 'app.js'));
  const { listenApp, cookieHeader, getSetCookieHeaders, mergeCookies } = require(path.join(ROOT, 'test/helpers/http.js'));
  const { setupTestDb } = require(path.join(ROOT, 'test/helpers/setup.js'));
  const { registerAndLogin, createChild } = require(path.join(ROOT, 'test/helpers/auth-session.js'));
  const { hashPassword } = require(path.join(ROOT, 'src/lib/hash'));
  const { getLocalDateStr } = require(path.join(ROOT, 'src/lib/daily-log-generator'));

  const db = await setupTestDb();
  if (db.skip) process.exit(2);

  const http = await listenApp(createApp);
  const baseUrl = http.baseUrl;
  const dateStr = getLocalDateStr(new Date(), 'Europe/Stockholm');
  const pin = '4821';

  try {
    const session = await registerAndLogin(baseUrl);
    await db.query('UPDATE parent SET onboarding_completed = true WHERE email = $1', [session.email]);
    const childId = await createChild(baseUrl, session, { name: 'SetupBarn' });
    await db.query(
      'UPDATE child SET username = $1, pin = $2, activity_timers_enabled = false WHERE id = $3',
      ['setupclr', await hashPassword(pin), childId]
    );

    const loginRes = await fetch(`${baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'setupclr', pin }),
    });
    let childCookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      childCookies = mergeCookies(childCookies, [header]);
    }

    const ctx = { dateStr, childCookies };
    const results = [];
    for (const vp of VIEWPORTS) {
      await db.query('UPDATE child SET activity_timers_enabled = false WHERE id = $1', [childId]);
      results.push(await runViewport(puppeteer, baseUrl, session, ctx, vp));
    }

    console.log(JSON.stringify({ step: 'r2-activity-timer-setup-clarity-smoke', results }, null, 2));
    if (results.some((r) => !r.pass)) process.exit(1);
    console.log('[r2-timer-setup-clarity] PASS');
  } finally {
    await http.close();
    await db.cleanup();
  }
}

main().catch((e) => {
  console.error('[r2-timer-setup-clarity]', e.message);
  process.exit(1);
});
