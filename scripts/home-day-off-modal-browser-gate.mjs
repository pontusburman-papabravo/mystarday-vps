#!/usr/bin/env node
/**
 * RC-1 R1 — Home day-off modal English copy (parent en-GB).
 * Local test DB + ephemeral family; does not touch allowlisted QA families.
 *
 * Usage: node scripts/home-day-off-modal-browser-gate.mjs
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

const EN_MARKERS = [
  'Day off',
  'Pauses your child',
  'does not need to check off',
  'Mark as day off',
];

function jarToCookieHeader(jar) {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
}

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

  // pragma: allowlist secret
  process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
  }

  const { setupTestDb } = require(path.join(ROOT, 'test/helpers/setup.js'));
  const { listenApp, cookieHeader } = require(path.join(ROOT, 'test/helpers/http.js'));
  const { createChild } = require(path.join(ROOT, 'test/helpers/auth-session.js'));
  const db = require(path.join(ROOT, 'src/lib/db'));

  const report = { step: 'home-day-off-modal-browser-gate', viewports: {}, pass: false };
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
    const email = `dayoff-en-${Date.now()}@example.com`;
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
    const { getSetCookieHeaders, mergeCookies } = require(path.join(ROOT, 'test/helpers/http.js'));
    let cookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      cookies = mergeCookies(cookies, [header]);
    }
    const session = { cookies, csrfToken: loginBody.csrfToken };
    await testDb.query(
      'UPDATE parent SET onboarding_completed = true WHERE lower(email) = lower($1)',
      [email]
    );
    await createChild(BASE, session);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const criticalConsole = [];

    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const t = msg.text().slice(0, 160);
          if (!/favicon|analytics|ResizeObserver|403|Failed to load resource/i.test(t)) criticalConsole.push(t);
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
      for (const c of puppeteerCookies(session.cookies, BASE)) await page.setCookie(c);
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForFunction(
        () => typeof window.openLedigDagModal === 'function',
        { timeout: 60000 },
      );
      await page.waitForFunction(
        () => {
          const el = document.querySelector('[data-i18n="home.dayOffModal.title"]');
          return el && /Day off/i.test(el.textContent || '');
        },
        { timeout: 60000 },
      );
      await page.evaluate(() => window.openLedigDagModal());
      await page.waitForSelector('#ledigDagModal:not(.hidden)', { timeout: 15000 });
      const metrics = await page.evaluate((markers) => {
        const modal = document.querySelector('#ledigDagModal');
        const text = modal?.innerText || '';
        const doc = document.documentElement;
        const overflowX = doc.scrollWidth > doc.clientWidth + 2;
        const actionButtons = modal
          ? Array.from(modal.querySelectorAll('button.ledig-dag-toggle-btn'))
          : [];
        const closeBtn = modal?.querySelector('button.ledig-dag-close-btn');
        const rectOk = (el, minW, minH) => {
          if (!el) return false;
          const r = el.getBoundingClientRect();
          return r.width >= minW && r.height >= minH;
        };
        const primaryTouchOk = actionButtons.length > 0
          && actionButtons.every((b) => rectOk(b, 44, 44));
        const closeTouchOk = rectOk(closeBtn, 44, 44);
        const touchOk = primaryTouchOk && closeTouchOk;
        const enOk = markers.every((m) => text.includes(m));
        const svOk = !/Ledig dag|Pausar barnets schema|Barnet behöver inte bocka/i.test(text);
        const primaryRects = actionButtons.map((b) => {
          const r = b.getBoundingClientRect();
          return { w: r.width, h: r.height };
        });
        const closeRect = closeBtn
          ? (() => { const r = closeBtn.getBoundingClientRect(); return { w: r.width, h: r.height }; })()
          : null;
        return {
          overflowX,
          touchOk,
          primaryTouchOk,
          closeTouchOk,
          enOk,
          svOk,
          actionButtonCount: actionButtons.length,
          primaryRects,
          closeRect,
          textSample: text.slice(0, 200),
        };
      }, EN_MARKERS);
      report.viewports[vp.name] = {
        ...metrics,
        pass: !metrics.overflowX && metrics.enOk && metrics.svOk && metrics.touchOk,
      };
      await page.close();
    }
    await browser.close();
    report.consoleErrors = criticalConsole.length;
    report.pass = report.consoleErrors === 0
      && Object.values(report.viewports).every((v) => v.pass);
  } finally {
    await http.close();
    await testDb.cleanup();
    try { await db.pool.end(); } catch { /* ignore */ }
  }

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => {
  console.log(JSON.stringify({ pass: false, error: e.message }));
  process.exit(1);
});
