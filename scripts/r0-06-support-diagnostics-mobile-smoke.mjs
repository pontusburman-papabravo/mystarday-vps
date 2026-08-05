#!/usr/bin/env node
/**
 * R0-06 — settings support diagnostics copy (mobile viewports).
 *
 * Usage:
 *   NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false node scripts/r0-06-support-diagnostics-mobile-smoke.mjs
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

async function hydrateParentPage(page, baseUrl, meUser, session) {
  const userJson = JSON.stringify(meUser);
  const csrf = session.csrfToken || '';
  await page.evaluateOnNewDocument((u, c) => {
    try {
      localStorage.setItem('stjarndag_user', u);
      localStorage.setItem('stjarndag_device_mode', 'parent');
      if (c) localStorage.setItem('stjarndag_csrf', c);
    } catch (_) { /* ignore */ }
  }, userJson, csrf);
  await page.setCookie(
    ...Object.entries(session.cookies).map(([name, value]) => ({
      name,
      value: String(value),
      url: baseUrl,
    }))
  );
}

async function runViewport(puppeteer, baseUrl, session, meUser, viewport) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(String(e.message || e)));

  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });

  await hydrateParentPage(page, baseUrl, meUser, session);
  await page.goto(`${baseUrl}/settings`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('#copySupportDiagnosticsBtn', { timeout: 20000 });
  await page.evaluate(() => {
    const btn = document.getElementById('copySupportDiagnosticsBtn');
    btn?.scrollIntoView({ block: 'center' });
  });
  await new Promise((r) => setTimeout(r, 400));

  const btnMeta = await page.evaluate(() => {
    const btn = document.getElementById('copySupportDiagnosticsBtn');
    if (!btn) return { minTouch: 0 };
    const r = btn.getBoundingClientRect();
    const w = r.width || btn.offsetWidth;
    const h = r.height || btn.offsetHeight;
    const minH = parseFloat(getComputedStyle(btn).minHeight) || 0;
    return { minTouch: Math.max(Math.min(w, h), minH) };
  });

  await page.evaluate(() => {
    const btn = document.getElementById('copySupportDiagnosticsBtn');
    if (btn) btn.click();
  });
  await page.waitForFunction(
    () => {
      const msg = document.getElementById('supportDiagnosticsMsg');
      return msg && /Kopierat/i.test(msg.textContent || '');
    },
    { timeout: 15000 }
  );

  const copied = await page.evaluate(() => (
    window.SupportDiagnostics && typeof window.SupportDiagnostics.getLastCopied === 'function'
      ? window.SupportDiagnostics.getLastCopied()
      : ''
  ));

  await browser.close();

  const hasCorrelation = /correlation_id=[^\n]+/i.test(copied);
  const hasCache = /cache_version=stjarndag-v\d+/i.test(copied);
  const hasApp = /app_version=/i.test(copied);
  const noEmail = !/@[^\s]+/.test(copied);
  const pass = hasCorrelation && hasCache && hasApp && noEmail
    && btnMeta.minTouch >= 44
    && consoleErrors.length === 0;

  return {
    viewport: viewport.name,
    pass,
    hasCorrelation,
    hasCache,
    hasApp,
    noEmail,
    minTouch: btnMeta.minTouch,
    consoleErrors,
    copiedPreview: copied.split('\n').slice(0, 6).join(' | '),
  };
}

async function main() {
  const puppeteer = await import('puppeteer').then((m) => m.default).catch(() => null);
  if (!puppeteer) {
    console.error('[r0-06-support] puppeteer missing');
    process.exit(2);
  }

  process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
  process.env.RATE_LIMIT_ENABLED = 'false';
  process.env.EMAIL_ENABLED = 'false';
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
  }

  const { createApp } = require(path.join(ROOT, 'app.js'));
  const { listenApp } = require(path.join(ROOT, 'test/helpers/http.js'));
  const { setupTestDb } = require(path.join(ROOT, 'test/helpers/setup.js'));
  const { registerAndLogin } = require(path.join(ROOT, 'test/helpers/auth-session.js'));
  const { cookieHeader } = require(path.join(ROOT, 'test/helpers/http.js'));

  const db = await setupTestDb();
  if (db.skip) {
    console.error('[r0-06-support] DATABASE_URL required');
    process.exit(2);
  }

  const http = await listenApp(createApp);
  const baseUrl = http.baseUrl;

  try {
    const session = await registerAndLogin(baseUrl);
    await db.query('UPDATE parent SET onboarding_completed = true WHERE email = $1', [
      session.email,
    ]);
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    if (!meRes.ok) throw new Error(`auth/me ${meRes.status}`);
    const meUser = await meRes.json();
    meUser.type = meUser.type || 'parent';

    const results = [];
    for (const vp of VIEWPORTS) {
      results.push(await runViewport(puppeteer, baseUrl, session, meUser, vp));
    }

    console.log(JSON.stringify({ step: 'r0-06-support-diagnostics', results }, null, 2));
    const failed = results.filter((r) => !r.pass);
    if (failed.length) {
      console.error('[r0-06-support] FAIL', failed);
      process.exit(1);
    }
    console.log('[r0-06-support] PASS');
  } finally {
    await http.close();
    await db.cleanup();
  }
}

main().catch((err) => {
  console.error('[r0-06-support]', err);
  process.exit(1);
});
