#!/usr/bin/env node
/**
 * R1 — activation enrollment sunset mobile smoke (local app, synthetic accounts).
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

async function runActivationFallbackScenario(page) {
  return page.evaluate(() => {
    const ids = ['journeyCoachMount', 'activationFirstSuccessCoachMount', 'engineCoachMount'];
    window.__journeyCoachLastContext = { recommended_experiences: [], priority: 'none' };
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.classList.add('hidden');
      el.innerHTML = '';
    }
    const a = document.getElementById('activationFirstSuccessCoachMount');
    const e = document.getElementById('engineCoachMount');
    if (a) {
      a.innerHTML = '<div class="activation-fs-coach" role="region"></div>';
      a.classList.remove('hidden');
    }
    if (e) {
      e.innerHTML = '<div class="engine-coach-card" role="region"></div>';
      e.classList.remove('hidden');
    }
    const out = window.HomePrimaryAction.apply();
    const visible = ids.filter((id) => {
      const el = document.getElementById(id);
      return el && !el.classList.contains('hidden') && el.innerHTML.trim();
    });
    return { winner: out.winner, visibleCount: visible.length };
  });
}

async function runViewport(puppeteer, baseUrl, session, meUser, viewport, inviteToken) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 160));
  });

  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });

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

  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction(
    () => window.HomePrimaryAction && document.getElementById('journeyCoachMount'),
    { timeout: 30000 }
  );

  const fallback = await runActivationFallbackScenario(page);
  const maxCoaches = fallback.visibleCount;

  await page.goto(`${baseUrl}/activation-enroll.html`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction(
    () => /\/(dashboard|login)/.test(window.location.pathname),
    { timeout: 30000 }
  );
  const leftEnroll = await page.evaluate(
    () => !window.location.pathname.includes('activation-enroll')
  );

  const inviteRes = await fetch(
    `${baseUrl}/api/public/activation-program/invite/${inviteToken}`,
    { redirect: 'manual' }
  );
  const inviteLocation = inviteRes.headers.get('location') || '';
  const inviteOk =
    inviteRes.status === 302 && !inviteLocation.includes('activation-enroll.html');

  await browser.close();

  const benignConsole = (text) =>
    /429|403|Failed to load resource|favicon|analytics|gtag|cookie/i.test(text);

  const hardConsoleErrors = consoleErrors.filter((e) => !benignConsole(e));

  const pass =
    fallback.winner === 'activation' &&
    fallback.visibleCount <= 1 &&
    leftEnroll &&
    inviteOk &&
    hardConsoleErrors.length === 0;

  return {
    viewport: viewport.name,
    pass,
    fallback,
    leftEnroll,
    inviteOk,
    consoleErrorCount: consoleErrors.length,
    hardConsoleErrorCount: hardConsoleErrors.length,
  };
}

async function main() {
  const puppeteer = await import('puppeteer').then((m) => m.default).catch(() => null);
  if (!puppeteer) {
    console.error('[r1-enrollment-sunset] puppeteer missing');
    process.exit(2);
  }

  process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
  process.env.RATE_LIMIT_ENABLED = 'false';
  process.env.EMAIL_ENABLED = 'false';
  process.env.ACTIVATION_PROGRAM_ENABLED = 'true';
  process.env.ACTIVATION_PROGRAM_LAUNCH_AT = '2020-01-01T00:00:00.000Z';
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
  }

  const { FLAG_KEYS } = require(path.join(ROOT, 'src/lib/journey/flags'));
  const emailInviteDb = require(path.join(ROOT, 'db/activation-program-email-invite'));
  const { createApp } = require(path.join(ROOT, 'app.js'));
  const { listenApp, cookieHeader } = require(path.join(ROOT, 'test/helpers/http.js'));
  const { setupTestDb } = require(path.join(ROOT, 'test/helpers/setup.js'));
  const { registerAndLogin } = require(path.join(ROOT, 'test/helpers/auth-session.js'));

  const db = await setupTestDb();
  if (db.skip) {
    console.error('[r1-enrollment-sunset] DATABASE_URL required');
    process.exit(2);
  }

  await db.query(
    `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, false, 'test')
     ON CONFLICT (key) DO UPDATE SET enabled = false`,
    [FLAG_KEYS.activationNewEnrollments]
  );

  const http = await listenApp(createApp);
  try {
    const session = await registerAndLogin(http.baseUrl);
    await db.query('UPDATE parent SET onboarding_completed = true WHERE email = $1', [session.email]);
    const meRes = await fetch(`${http.baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    const meUser = await meRes.json();
    meUser.type = meUser.type || 'parent';

    const parentRow = await db.query('SELECT id, family_id FROM parent WHERE email = $1', [session.email]);
    const invite = await emailInviteDb.createInvite(
      parentRow.rows[0].id,
      parentRow.rows[0].family_id
    );
    await emailInviteDb.markSent(invite.id);

    const results = [];
    for (const vp of VIEWPORTS) {
      results.push(
        await runViewport(puppeteer, http.baseUrl, session, meUser, vp, invite.token)
      );
    }

    console.log(JSON.stringify({ step: 'r1-activation-enrollment-sunset-mobile', results }, null, 2));
    if (results.some((r) => !r.pass)) process.exit(1);
    console.log('[r1-enrollment-sunset] PASS');
  } finally {
    await http.close();
    await db.cleanup();
  }
}

main().catch((err) => {
  console.error('[r1-enrollment-sunset]', err);
  process.exit(1);
});
