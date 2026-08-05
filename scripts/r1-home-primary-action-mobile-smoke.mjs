#!/usr/bin/env node
/**
 * R1 — at most one visible primary coach on Hem (magic hub), both mobile viewports.
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

async function hydrateParent(page, baseUrl, meUser, session) {
  await page.evaluateOnNewDocument((u, c) => {
    try {
      localStorage.setItem('stjarndag_user', u);
      localStorage.setItem('stjarndag_device_mode', 'parent');
      if (c) localStorage.setItem('stjarndag_csrf', c);
    } catch (_) { /* ignore */ }
  }, JSON.stringify(meUser), session.csrfToken || '');
  await page.setCookie(
    ...Object.entries(session.cookies).map(([name, value]) => ({
      name,
      value: String(value),
      url: baseUrl,
    }))
  );
}

async function auditCoachSlot(page) {
  return page.evaluate(() => {
    const slot = document.getElementById('parentHubCoachSlot');
    const mounts = ['journeyCoachMount', 'activationFirstSuccessCoachMount', 'engineCoachMount'];
    let visiblePrimary = 0;
    const visibleIds = [];
    for (const id of mounts) {
      const el = document.getElementById(id);
      if (!el || el.classList.contains('hidden')) continue;
      const card = el.querySelector('.journey-coach-card, .activation-fs-coach, .engine-coach-card, [role="region"]');
      if (card && (el.innerHTML || '').trim()) {
        visiblePrimary += 1;
        visibleIds.push(id);
      }
    }
    const winner = window.HomePrimaryAction && typeof HomePrimaryAction.resolveWinner === 'function'
      ? HomePrimaryAction.resolveWinner().winner
      : null;
    const magic = document.body.classList.contains('parent-magic-dashboard');
    return { visiblePrimary, visibleIds, winner, magic, hasSlot: !!slot };
  });
}

async function runViewport(puppeteer, baseUrl, session, meUser, viewport) {
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

  await hydrateParent(page, baseUrl, meUser, session);
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction(
    () => document.body.classList.contains('parent-magic-dashboard')
      && document.getElementById('parentHubCoachSlot'),
    { timeout: 45000 }
  ).catch(() => null);
  await page.waitForFunction(
    () => window.HomePrimaryAction && typeof window.HomePrimaryAction.apply === 'function',
    { timeout: 15000 }
  ).catch(() => null);
  await new Promise((r) => setTimeout(r, 4000));

  const audit = await auditCoachSlot(page);
  await browser.close();

  const pass = audit.visiblePrimary <= 1;
  return { viewport: viewport.name, pass, ...audit };
}

async function main() {
  const puppeteer = await import('puppeteer').then((m) => m.default).catch(() => null);
  if (!puppeteer) {
    console.error('[r1-hem] puppeteer missing');
    process.exit(2);
  }

  process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
  process.env.RATE_LIMIT_ENABLED = 'false';
  process.env.EMAIL_ENABLED = 'false';
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
  }

  const { createApp } = require(path.join(ROOT, 'app.js'));
  const { listenApp, cookieHeader } = require(path.join(ROOT, 'test/helpers/http.js'));
  const { setupTestDb } = require(path.join(ROOT, 'test/helpers/setup.js'));
  const { registerAndLogin } = require(path.join(ROOT, 'test/helpers/auth-session.js'));

  const db = await setupTestDb();
  if (db.skip) {
    console.error('[r1-hem] DATABASE_URL required');
    process.exit(2);
  }

  const http = await listenApp(createApp);
  const baseUrl = http.baseUrl;

  try {
    const session = await registerAndLogin(baseUrl);
    await db.query('UPDATE parent SET onboarding_completed = true WHERE email = $1', [session.email]);
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    const meUser = await meRes.json();
    meUser.type = meUser.type || 'parent';

    const results = [];
    for (const vp of VIEWPORTS) {
      results.push(await runViewport(puppeteer, baseUrl, session, meUser, vp));
    }

    console.log(JSON.stringify({ step: 'r1-home-primary-action', results }, null, 2));
    const failed = results.filter((r) => !r.pass);
    if (failed.length) {
      console.error('[r1-hem] FAIL', failed);
      process.exit(1);
    }
    console.log('[r1-hem] PASS');
  } finally {
    await http.close();
    await db.cleanup();
  }
}

main().catch((err) => {
  console.error('[r1-hem]', err);
  process.exit(1);
});
