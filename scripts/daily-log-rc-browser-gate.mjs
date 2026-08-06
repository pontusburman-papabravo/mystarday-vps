#!/usr/bin/env node
/**
 * RC-1 R3 — Daily log: parent bottom nav aria-label + log boot (en-GB).
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

function puppeteerCookies(jar, baseUrl) {
  const host = new URL(baseUrl).hostname;
  return Object.entries(jar).map(([name, value]) => ({
    name, value, domain: host, path: '/',
  }));
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
  const { listenApp, mergeCookies, getSetCookieHeaders } = require(path.join(ROOT, 'test/helpers/http.js'));
  const { createChild } = require(path.join(ROOT, 'test/helpers/auth-session.js'));
  const { runParentNavAriaRegression } = await import(path.join(ROOT, 'scripts/parent-nav-aria-regression-gate.mjs'));

  const report = { step: 'daily-log-rc-browser-gate', regression: null, viewports: {}, pass: false };
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
       ON CONFLICT (key) DO UPDATE SET value = 'true'`
    );
    const email = `dailylog-en-${Date.now()}@example.com`;
    const password = 'integration-test-pass-1';
    const reg = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        name: 'Parent',
        preferred_locale: 'en-GB',
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
    let cookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      cookies = mergeCookies(cookies, [header]);
    }
    await testDb.query(
      'UPDATE parent SET onboarding_completed = true WHERE lower(email) = lower($1)',
      [email]
    );
    const childId = await createChild(BASE, { cookies, csrfToken: loginBody.csrfToken });

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const regressionPage = await browser.newPage();
    await regressionPage.setViewport({ width: 1280, height: 900, isMobile: false });
    for (const c of puppeteerCookies(cookies, BASE)) await regressionPage.setCookie(c);
    const { regression, pass: regressionPass } = await runParentNavAriaRegression({
      BASE,
      cookies,
      childId,
      page: regressionPage,
    });
    report.regression = regression;
    await regressionPage.close();

    if (!regressionPass) {
      await browser.close();
      report.pass = false;
      console.log(JSON.stringify(report, null, 2));
      await http.close();
      await testDb.cleanup();
      try {
        const db = require(path.join(ROOT, 'src/lib/db'));
        await db.pool.end();
      } catch { /* ignore */ }
      process.exit(1);
    }

    const criticalConsole = [];
    let logFetchCount = 0;

    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const t = msg.text().slice(0, 160);
          if (!/favicon|analytics|ResizeObserver|403|Failed to load resource/i.test(t)) {
            criticalConsole.push(t);
          }
        }
      });
      page.on('response', (res) => {
        const u = res.url();
        if (u.includes('/api/children/') && u.includes('/daily-log') && res.status() === 200) {
          logFetchCount += 1;
        }
      });
      await page.setViewport({
        width: vp.width,
        height: vp.height,
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      });
      await page.evaluateOnNewDocument(() => {
        document.documentElement.style.fontSize = '125%';
      });
      for (const c of puppeteerCookies(cookies, BASE)) await page.setCookie(c);

      await page.goto(`${BASE}/daily-log?childId=${encodeURIComponent(childId)}`, {
        waitUntil: 'domcontentloaded',
        timeout: 90000,
      });
      await page.waitForFunction(
        () => typeof window.pt === 'function' && window.pt('nav.mainAria') === 'Main navigation',
        { timeout: 90000 },
      );
      await page.evaluate(async () => {
        if (window.ParentMagicShell && typeof ParentMagicShell.init === 'function') {
          await ParentMagicShell.init('daily-log');
        }
        if (window.ParentMagicShell && typeof ParentMagicShell.refresh === 'function') {
          ParentMagicShell.refresh();
        }
      });
      await page.waitForFunction(
        () => document.querySelector('#parentBottomNav')?.getAttribute('aria-label') === 'Main navigation',
        { timeout: 30000 },
      );
      await page.waitForFunction(
        () => {
          const log = document.getElementById('logContent');
          const t = log?.innerText || '';
          return t.length > 10 && !/Select a child to view|Välj barn/i.test(t);
        },
        { timeout: 90000 },
      );

      const metrics = await page.evaluate(() => {
        const nav = document.querySelector('#parentBottomNav');
        const aria = nav?.getAttribute('aria-label') || '';
        const links = nav ? Array.from(nav.querySelectorAll('a.parent-bottom-nav-btn')) : [];
        const labels = links.map((a) => (a.innerText || '').trim());
        const logText = document.getElementById('logContent')?.innerText || '';
        const tabEl = document.querySelector('#childTabs button, #childTabs [data-id]');
        const tabRect = tabEl ? tabEl.getBoundingClientRect() : null;
        const doc = document.documentElement;
        return {
          ariaLabel: aria,
          navLinkCount: links.length,
          navEnglish: labels.length === 0 || labels.some((l) => /Home|Planning/i.test(l)),
          logHasContent: logText.length > 10,
          tabTouchOk: tabRect ? tabRect.height >= 44 : true,
          overflowX: doc.scrollWidth > doc.clientWidth + 2,
          singleNav: document.querySelectorAll('#parentBottomNav').length === 1,
        };
      });

      report.viewports[vp.name] = {
        ...metrics,
        pass: metrics.ariaLabel === 'Main navigation'
          && metrics.logHasContent
          && metrics.tabTouchOk
          && !metrics.overflowX
          && metrics.singleNav
          && metrics.navEnglish,
      };
      await page.close();
    }

    await browser.close();
    report.logFetchCount = logFetchCount;
    report.consoleErrors = criticalConsole.length;
    report.pass = report.consoleErrors === 0
      && logFetchCount >= 1
      && VIEWPORTS.every((vp) => report.viewports[vp.name]?.pass);

    await http.close();
    await testDb.cleanup();
    try {
      const db = require(path.join(ROOT, 'src/lib/db'));
      await db.pool.end();
    } catch { /* ignore */ }

    console.log(JSON.stringify(report, null, 2));
    process.exit(report.pass ? 0 : 1);
  } catch (e) {
    console.log(JSON.stringify({ pass: false, error: e.message }));
    try { await http.close(); } catch { /* ignore */ }
    try { await testDb.cleanup(); } catch { /* ignore */ }
    process.exit(1);
  }
}

main();
