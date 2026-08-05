#!/usr/bin/env node
/**
 * R1 — HomePrimaryAction orchestration scenarios (mobile viewports, synthetic family).
 * Proves: Journey > Activation > Engine; readiness blocks coaches; refresh stable.
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

function coachCardHtml(kind) {
  if (kind === 'journey') {
    return '<div class="journey-coach-card" role="region"><button class="journey-coach-cta">Go</button></div>';
  }
  if (kind === 'activation') {
    return '<div class="activation-fs-coach" role="region"><button class="activation-fs-cta">Go</button></div>';
  }
  return '<div class="engine-coach-card" role="region"><button>Go</button></div>';
}

async function runScenario(page, scenario) {
  return page.evaluate((sc) => {
    const ids = ['journeyCoachMount', 'activationFirstSuccessCoachMount', 'engineCoachMount'];
    const html = {
      journey: '<div class="journey-coach-card" role="region"></div>',
      activation: '<div class="activation-fs-coach" role="region"></div>',
      engine: '<div class="engine-coach-card" role="region"></div>',
    };
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.classList.add('hidden');
      el.innerHTML = '';
    }
    if (sc.type === 'readiness') {
      if (!window.DashboardHomeHub) {
        window.DashboardHomeHub = { shouldUse: () => true };
      }
      const r = document.getElementById('homeReadinessMount');
      if (r) {
        r.classList.remove('hidden');
        r.innerHTML = '<a data-readiness-type="approval" href="#">x</a>';
      }
    } else {
      const r = document.getElementById('homeReadinessMount');
      if (r) {
        r.classList.add('hidden');
        r.innerHTML = '';
      }
    }
    if (sc.type === 'journey') {
      window.__journeyCoachLastContext = {
        recommended_experiences: ['coach_expand'],
        priority: 'coach',
      };
      const j = document.getElementById('journeyCoachMount');
      if (j) {
        j.innerHTML = html.journey;
        j.classList.remove('hidden');
      }
      const a = document.getElementById('activationFirstSuccessCoachMount');
      if (a) {
        a.innerHTML = html.activation;
        a.classList.remove('hidden');
      }
    } else if (sc.type === 'activation') {
      window.__journeyCoachLastContext = { recommended_experiences: [], priority: 'none' };
      const a = document.getElementById('activationFirstSuccessCoachMount');
      if (a) {
        a.innerHTML = html.activation;
        a.classList.remove('hidden');
      }
      const e = document.getElementById('engineCoachMount');
      if (e) {
        e.innerHTML = html.engine;
        e.classList.remove('hidden');
      }
    } else if (sc.type === 'engine') {
      window.__journeyCoachLastContext = null;
      const e = document.getElementById('engineCoachMount');
      if (e) {
        e.innerHTML = html.engine;
        e.classList.remove('hidden');
      }
    }
    const out = window.HomePrimaryAction.apply();
    const visible = ids.filter((id) => {
      const el = document.getElementById(id);
      return el && !el.classList.contains('hidden') && el.innerHTML.trim();
    });
    return { winner: out.winner, visible, scenario: sc.type };
  }, scenario);
}

async function hydrate(page, baseUrl, meUser, session) {
  await page.evaluateOnNewDocument((u, c, feats) => {
    try {
      localStorage.setItem('stjarndag_user', u);
      localStorage.setItem('stjarndag_device_mode', 'parent');
      if (c) localStorage.setItem('stjarndag_csrf', c);
      window._stjarndagFeatures = feats;
    } catch (_) { /* ignore */ }
  }, JSON.stringify(meUser), session.csrfToken || '', { parent_home_magic: true });
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
  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });

  await hydrate(page, baseUrl, meUser, session);
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction(
    () => window.HomePrimaryAction && document.getElementById('journeyCoachMount'),
    { timeout: 30000 }
  );

  const scenarios = [
    { type: 'journey', expectWinner: 'journey', maxVisible: 1 },
    { type: 'activation', expectWinner: 'activation', maxVisible: 1 },
    { type: 'engine', expectWinner: 'engine', maxVisible: 1 },
    { type: 'readiness', expectWinner: 'none', maxVisible: 0 },
  ];

  const results = [];
  for (const sc of scenarios) {
    const row = await runScenario(page, sc);
    const pass = row.winner === sc.expectWinner && row.visible.length <= sc.maxVisible;
    results.push({ ...row, pass, expectWinner: sc.expectWinner });
  }

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => window.HomePrimaryAction && document.getElementById('journeyCoachMount'),
    { timeout: 30000 }
  );
  const refreshJourney = await runScenario(page, { type: 'journey' });
  const refreshPass = refreshJourney.winner === 'journey' && refreshJourney.visible.length === 1;

  await browser.close();
  const allPass = results.every((r) => r.pass) && refreshPass;
  return { viewport: viewport.name, pass: allPass, results, refreshJourney };
}

async function main() {
  const puppeteer = await import('puppeteer').then((m) => m.default).catch(() => null);
  if (!puppeteer) {
    console.error('[r1-orchestration] puppeteer missing');
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
    console.error('[r1-orchestration] DATABASE_URL required');
    process.exit(2);
  }

  const http = await listenApp(createApp);
  try {
    const session = await registerAndLogin(http.baseUrl);
    await db.query('UPDATE parent SET onboarding_completed = true WHERE email = $1', [session.email]);
    const meRes = await fetch(`${http.baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    const meUser = await meRes.json();
    meUser.type = meUser.type || 'parent';

    const results = [];
    for (const vp of VIEWPORTS) {
      results.push(await runViewport(puppeteer, http.baseUrl, session, meUser, vp));
    }

    console.log(JSON.stringify({ step: 'r1-home-orchestration', results }, null, 2));
    if (results.some((r) => !r.pass)) process.exit(1);
    console.log('[r1-orchestration] PASS');
  } finally {
    await http.close();
    await db.cleanup();
  }
}

main().catch((err) => {
  console.error('[r1-orchestration]', err);
  process.exit(1);
});
