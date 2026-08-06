#!/usr/bin/env node
/**
 * R4.1 — post-schema handoff browser gate (emulated mobile, not physical device).
 * Viewports: 390×844, 412×915 @ 125% zoom (CSS zoom via deviceScaleFactor).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const VIEWPORTS = [
  { name: '390x844', width: 390, height: 844, deviceScaleFactor: 2.5 },
  { name: '412x915', width: 412, height: 915, deviceScaleFactor: 2.5 },
];

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

export async function runR41HandoffBrowserGate({ BASE, cookies, familyId, page, locale }) {
  const expectedTitle = locale === 'en-GB'
    ? 'Next step: Let your child try their routine'
    : 'Nästa steg: Låt barnet testa sin rutin';
  const expectedCta = locale === 'en-GB' ? 'Try child mode now' : 'Testa barnläget nu';

  await page.goto(`${BASE}/dashboard?next_step=child_handoff`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });

  await page.waitForFunction(
    () => {
      const handoff = document.querySelector('.parent-handoff-card');
      return handoff
        && handoff.classList.contains('parent-handoff-post-schema')
        && typeof window.pt === 'function';
    },
    { timeout: 90000 },
  );

  const metrics = await page.evaluate((expTitle, expCta) => {
    const handoff = document.querySelector('.parent-handoff-card');
    const primary = handoff?.querySelector('[data-action="child-login"]');
    const secondary = handoff?.querySelector('[data-action="parent-logout"]');
    const rect = primary?.getBoundingClientRect();
    const title = handoff?.querySelector('.parent-handoff-title')?.textContent?.trim() || '';
    const cta = primary?.textContent?.trim() || '';
    const scrollW = document.documentElement.scrollWidth;
    const clientW = document.documentElement.clientWidth;
    return {
      handoffVisible: handoff && !handoff.classList.contains('hidden'),
      postSchemaClass: handoff?.classList.contains('parent-handoff-post-schema') || false,
      title,
      cta,
      titleOk: title === expTitle,
      ctaOk: cta === expCta,
      logoutHidden: secondary?.classList.contains('hidden') || secondary?.offsetParent === null,
      primaryMinHeight: rect ? rect.height : 0,
      horizontalScroll: scrollW > clientW + 2,
      consoleErrors: window.__r41ConsoleErrors || [],
    };
  }, expectedTitle, expectedCta);

  const primaryTouchOk = metrics.primaryMinHeight >= 44;
  return {
    ...metrics,
    primaryTouchOk,
    pass: metrics.handoffVisible
      && metrics.postSchemaClass
      && metrics.titleOk
      && metrics.ctaOk
      && metrics.logoutHidden
      && primaryTouchOk
      && !metrics.horizontalScroll,
  };
}

async function main() {
  process.env.NODE_ENV = 'test';
  process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
  process.env.RATE_LIMIT_ENABLED = 'false';
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
  }

  const puppeteer = require('puppeteer');
  const { setupTestDb } = require(path.join(ROOT, 'test/helpers/setup.js'));
  const { listenApp } = require(path.join(ROOT, 'test/helpers/http.js'));
  const { createChild } = require(path.join(ROOT, 'test/helpers/auth-session.js'));
  const { onboardingScheduleRaw } = require(path.join(ROOT, 'test/helpers/golden-path-fas6.js'));

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
    const email = `r41-handoff-${Date.now()}@example.com`;
    const { cookies, csrfToken } = await registerParent(BASE, {
      email,
      password,
      preferred_locale: 'en-GB',
    });
    await testDb.query(
      'UPDATE parent SET onboarding_completed = true WHERE lower(email) = lower($1)',
      [email],
    );
    const parentRow = await testDb.query('SELECT family_id FROM parent WHERE email = $1', [email]);
    const familyId = parentRow.rows[0].family_id;
    await testDb.query(
      `INSERT INTO family_features (family_id, feature_slug) VALUES ($1, 'english_app') ON CONFLICT DO NOTHING`,
      [familyId],
    );
    const childId = await createChild(BASE, { cookies, csrfToken });
    await onboardingScheduleRaw(BASE, { cookies, csrfToken }, { child_id: childId, template_group: 'helg' });

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const results = {};
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({
        width: vp.width,
        height: vp.height,
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: vp.deviceScaleFactor,
      });
      page.on('pageerror', (err) => {
        page.evaluate((msg) => {
          window.__r41ConsoleErrors = window.__r41ConsoleErrors || [];
          window.__r41ConsoleErrors.push(String(msg));
        }, err.message).catch(() => {});
      });
      for (const c of puppeteerCookies(cookies, BASE)) await page.setCookie(c);
      results[vp.name] = await runR41HandoffBrowserGate({
        BASE,
        cookies,
        familyId,
        page,
        locale: 'en-GB',
      });
      await page.close();
    }

    await browser.close();
    await http.close();
    await testDb.cleanup();
    try {
      const db = require(path.join(ROOT, 'src/lib/db'));
      await db.pool.end();
    } catch { /* ignore */ }

    const pass = Object.values(results).every((r) => r.pass);
    const report = { step: 'r41-post-schema-handoff-browser-gate', results, pass };
    console.log(JSON.stringify(report, null, 2));
    process.exit(pass ? 0 : 1);
  } catch (err) {
    await http.close().catch(() => {});
    await testDb.cleanup().catch(() => {});
    console.error(err);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
