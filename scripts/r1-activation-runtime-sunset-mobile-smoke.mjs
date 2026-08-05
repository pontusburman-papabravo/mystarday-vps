#!/usr/bin/env node
/**
 * R1 — Activation Program runtime sunset mobile smoke (local app).
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

async function runViewport(puppeteer, baseUrl, session, meUser, viewport, mode) {
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

  await page.evaluateOnNewDocument((u, c) => {
    localStorage.setItem('stjarndag_user', u);
    localStorage.setItem('stjarndag_device_mode', 'parent');
    if (c) localStorage.setItem('stjarndag_csrf', c);
    window._stjarndagFeatures = { parent_home_magic: true };
  }, JSON.stringify(meUser), session.csrfToken || '');

  await page.setCookie(
    ...Object.entries(session.cookies).map(([name, value]) => ({
      name,
      value: String(value),
      url: baseUrl,
    }))
  );

  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
  const hasOrchestrator = await page
    .waitForFunction(
      () => window.HomePrimaryAction && document.getElementById('journeyCoachMount'),
      { timeout: 20000 }
    )
    .then(() => true)
    .catch(() => false);

  let apiStatus = 0;
  if (typeof session.csrfToken === 'string') {
    const cookieStr = Object.entries(session.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    const res = await fetch(`${baseUrl}/api/me/activation-program`, {
      headers: { Cookie: cookieStr },
    });
    apiStatus = res.status;
  }

  let fallback = { winner: null, visibleCount: 0 };
  if (hasOrchestrator) {
    fallback = await page.evaluate(() => {
    window.__journeyCoachLastContext = { recommended_experiences: [], priority: 'none' };
    const a = document.getElementById('activationFirstSuccessCoachMount');
    const e = document.getElementById('engineCoachMount');
    if (a) {
      a.innerHTML = '<div class="activation-fs-coach" role="region"></div>';
      a.classList.remove('hidden');
    }
    if (e) {
      e.innerHTML = '<div class="engine-coach-card" role="region"></div>';
      e.classList.add('hidden');
    }
    const out = window.HomePrimaryAction.apply();
    const visible = ['journeyCoachMount', 'activationFirstSuccessCoachMount', 'engineCoachMount'].filter(
      (id) => {
        const el = document.getElementById(id);
        return el && !el.classList.contains('hidden') && el.innerHTML.trim();
      }
    );
    return { winner: out.winner, visibleCount: visible.length };
    });
  }

  const pass =
    mode === 'no_program'
      ? apiStatus === 410 &&
        (!hasOrchestrator || (fallback.winner === 'activation' && fallback.visibleCount <= 1))
      : apiStatus === 200 && (!hasOrchestrator || fallback.visibleCount <= 1);

  await browser.close();
  return { viewport: viewport.name, mode, pass, apiStatus, fallback };
}

async function main() {
  const puppeteer = await import('puppeteer').then((m) => m.default).catch(() => null);
  if (!puppeteer) process.exit(2);

  process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
  process.env.RATE_LIMIT_ENABLED = 'false';
  process.env.EMAIL_ENABLED = 'false';
  process.env.ACTIVATION_PROGRAM_ENABLED = 'true';
  process.env.ACTIVATION_PROGRAM_LAUNCH_AT = '2020-01-01T00:00:00.000Z';
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
  }

  const { FLAG_KEYS } = require(path.join(ROOT, 'src/lib/journey/flags'));
  const parentActivationProgram = require(path.join(ROOT, 'db/parent-activation-program'));
  const { createApp } = require(path.join(ROOT, 'app.js'));
  const { listenApp, cookieHeader } = require(path.join(ROOT, 'test/helpers/http.js'));
  const { setupTestDb } = require(path.join(ROOT, 'test/helpers/setup.js'));
  const { registerAndLogin } = require(path.join(ROOT, 'test/helpers/auth-session.js'));

  const db = await setupTestDb();
  if (db.skip) process.exit(2);

  await db.query(
    `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, false, 'test')
     ON CONFLICT (key) DO UPDATE SET enabled = false`,
    [FLAG_KEYS.activationNewEnrollments]
  );
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, true, 'test')
     ON CONFLICT (key) DO UPDATE SET enabled = excluded.enabled`,
    [FLAG_KEYS.activationApiDeprecated]
  );

  const http = await listenApp(createApp);
  try {
    const results = [];

    const sessionA = await registerAndLogin(http.baseUrl);
    await db.query('UPDATE parent SET onboarding_completed = true WHERE email = $1', [sessionA.email]);
    const meA = await (await fetch(`${http.baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(sessionA.cookies) },
    })).json();
    meA.type = 'parent';
    for (const vp of VIEWPORTS) {
      results.push(
        await runViewport(puppeteer, http.baseUrl, sessionA, meA, vp, 'no_program')
      );
    }

    const sessionB = await registerAndLogin(http.baseUrl);
    await db.query('UPDATE parent SET onboarding_completed = true WHERE email = $1', [sessionB.email]);
    const meB = await (await fetch(`${http.baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(sessionB.cookies) },
    })).json();
    const parentRow = await db.query('SELECT id, family_id FROM parent WHERE email = $1', [sessionB.email]);
    await parentActivationProgram.create({
      familyId: parentRow.rows[0].family_id,
      parentId: parentRow.rows[0].id,
      cohortArm: 'treatment',
      programType: 'onboarding_7d',
    });
    meB.type = 'parent';
    for (const vp of VIEWPORTS) {
      results.push(
        await runViewport(puppeteer, http.baseUrl, sessionB, meB, vp, 'participant')
      );
    }

    console.log(JSON.stringify({ step: 'r1-activation-runtime-sunset-mobile', results }, null, 2));
    if (results.some((r) => !r.pass)) process.exit(1);
    console.log('[r1-runtime-sunset-mobile] PASS');
  } finally {
    await http.close();
    await db.cleanup();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
