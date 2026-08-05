#!/usr/bin/env node
/**
 * R0-03 — child PIN login → usable /child/today (mobile viewports).
 *
 * Usage:
 *   NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false node scripts/r0-03-child-login-today-smoke.mjs
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

const SLOW_NETWORK = {
  offline: false,
  downloadThroughput: (400 * 1024) / 8,
  uploadThroughput: (200 * 1024) / 8,
  latency: 200,
};

/** Generous CI-local ceilings (ms) after R0-03 redirect + render fixes. */
const BUDGET = {
  toVisualMs: 2500,
  toTodayMs: 4500,
  toFirstActivityMs: 6500,
  toInteractiveMs: 7500,
};

function median(nums) {
  const s = nums.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!s.length) return null;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

async function runOnce(puppeteer, baseUrl, db, { childName, username, pin, itemId, dateStr, viewport, slowNet, familyId }) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  const client = await page.createCDPSession();
  if (slowNet) await client.send('Network.emulateNetworkConditions', SLOW_NETWORK);

  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });

  const apiLog = [];
  page.on('response', (res) => {
    const u = res.url();
    if (!u.includes('/api/')) return;
    if (u.includes('/api/auth/child-login') || u.includes('/api/me/daily-log')
      || u.includes('/api/auth/me') || u.includes('/api/me/goal')) {
      apiLog.push({ url: u.replace(baseUrl, ''), status: res.status() });
    }
  });
  const consoleErrors = [];
  page.on('pageerror', (err) => consoleErrors.push(String(err.message || err)));

  const knownChild = JSON.stringify({
    username,
    name: childName,
    emoji: '⭐',
    has_avatar: false,
    avatar_src: null,
    familyId: familyId || null,
  });

  await page.evaluateOnNewDocument((known) => {
    try {
      localStorage.setItem('stjarndag_known_children', known);
      localStorage.setItem('substepIntroSeen', '1');
    } catch (_) { /* ignore */ }
  }, `[${knownChild}]`);

  const t0 = Date.now();
  await page.goto(`${baseUrl}/child-login`, { waitUntil: 'domcontentloaded', timeout: 45000 });

  await page.evaluate((u) => {
    if (typeof window.selectChild === 'function') window.selectChild(u);
  }, username);

  await page.waitForSelector('#clStepPin.active', { timeout: 15000 });
  await page.waitForSelector('#clKeypad button[data-action="1"]', { timeout: 15000 });

  const pinSubmitAt = Date.now();
  for (const digit of pin.split('')) {
    await page.click(`#clKeypad button[data-action="${digit}"]`);
    await new Promise((r) => setTimeout(r, 120));
  }

  await page.waitForFunction(
    () => document.getElementById('clSuccessBox')?.classList.contains('visible')
      || location.pathname.indexOf('/child/') === 0,
    { timeout: 8000 }
  ).catch(() => null);
  const tVisual = Date.now();

  await page.waitForFunction(
    () => location.pathname.indexOf('/child/today') === 0,
    { timeout: 15000 }
  );
  const tToday = Date.now();

  await page.waitForSelector('[data-item-id]', { timeout: 20000 });
  const tFirstActivity = Date.now();

  const itemSel = `[data-item-id="${itemId}"]`;
  await page.waitForSelector(itemSel, { timeout: 10000 });
  const interactive = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }, itemSel);
  const tInteractive = Date.now();

  const marks = await page.evaluate(() => {
    const entries = performance.getEntriesByType('mark').map((e) => e.name);
    return entries;
  });

  const http5xx = apiLog.filter((e) => e.status >= 500);
  const loadingStuck = await page.evaluate(() => {
    const sv = document.getElementById('scheduleView');
    const text = sv ? sv.textContent || '' : '';
    return /Laddar|Loading/i.test(text) && !document.querySelector('[data-item-id]');
  });

  await browser.close();

  return {
    viewport: viewport.name,
    slowNet: !!slowNet,
    ms: {
      toVisual: tVisual - pinSubmitAt,
      toToday: tToday - pinSubmitAt,
      toFirstActivity: tFirstActivity - pinSubmitAt,
      toInteractive: tInteractive - pinSubmitAt,
      total: tInteractive - t0,
    },
    interactive,
    marks,
    apiCalls: apiLog.length,
    apiLog,
    http5xx: http5xx.length,
    consoleErrors,
    loadingStuck,
  };
}

async function main() {
  const puppeteer = await import('puppeteer').then((m) => m.default).catch(() => null);
  if (!puppeteer) {
    console.error('[r0-03-mobile] puppeteer missing');
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
  const { registerAndLogin, createChild } = require(path.join(ROOT, 'test/helpers/auth-session.js'));
  const { getLocalDateStr } = require(path.join(ROOT, 'src/lib/daily-log-generator'));

  const db = await setupTestDb();
  if (db.skip) {
    console.error('[r0-03-mobile] DATABASE_URL required');
    process.exit(2);
  }

  const http = await listenApp(createApp);
  const baseUrl = http.baseUrl;
  const dateStr = getLocalDateStr(new Date(), 'Europe/Stockholm');

  try {
    const session = await registerAndLogin(baseUrl);
    const pin = '2580';
    const childName = `R0Perf${Date.now().toString(36).slice(-4)}`;
    const childId = await createChild(baseUrl, session, {
      name: childName,
      pin,
      birthday: '2018-03-01',
    });
    const row = await db.query('SELECT username, family_id FROM child WHERE id = $1', [childId]);
    const { username, family_id: familyId } = row.rows[0];

    const tpl = await db.query(
      `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, source)
       VALUES ($1, 'R0PerfAkt', '⭐', 1, 0, 'user') RETURNING id`,
      [familyId]
    );
    await db.query(
      'DELETE FROM daily_log_item WHERE daily_log_id IN (SELECT id FROM daily_log WHERE child_id = $1 AND date = $2)',
      [childId, dateStr]
    );
    await db.query('DELETE FROM daily_log WHERE child_id = $1 AND date = $2', [childId, dateStr]);
    const logRes = await db.query(
      'INSERT INTO daily_log (child_id, date) VALUES ($1, $2) RETURNING id',
      [childId, dateStr]
    );
    const itemRes = await db.query(
      `INSERT INTO daily_log_item
         (daily_log_id, activity_template_id, name, icon, star_value, sort_order, section)
       VALUES ($1, $2, 'R0PerfAkt', '⭐', 1, 0, 'morgon') RETURNING id`,
      [logRes.rows[0].id, tpl.rows[0].id]
    );
    const itemId = itemRes.rows[0].id;

    const allRuns = [];
    for (const vp of VIEWPORTS) {
      for (let i = 0; i < 2; i++) {
        allRuns.push(await runOnce(puppeteer, baseUrl, db, {
          childName, username, pin, itemId, dateStr, viewport: vp, slowNet: i === 1, familyId,
        }));
      }
    }

    const summary = {};
    for (const vp of VIEWPORTS) {
      const runs = allRuns.filter((r) => r.viewport === vp.name && !r.slowNet);
      summary[vp.name] = {
        toVisualMs: median(runs.map((r) => r.ms.toVisual)),
        toTodayMs: median(runs.map((r) => r.ms.toToday)),
        toFirstActivityMs: median(runs.map((r) => r.ms.toFirstActivity)),
        toInteractiveMs: median(runs.map((r) => r.ms.toInteractive)),
      };
    }

    const failed = allRuns.filter((r) => {
      if (!r.interactive || r.loadingStuck || r.http5xx > 0 || r.consoleErrors.length) return true;
      if (!r.slowNet) {
        if (r.ms.toVisual > BUDGET.toVisualMs) return true;
        if (r.ms.toToday > BUDGET.toTodayMs) return true;
        if (r.ms.toFirstActivity > BUDGET.toFirstActivityMs) return true;
        if (r.ms.toInteractive > BUDGET.toInteractiveMs) return true;
      }
      return false;
    });

    console.log(JSON.stringify({
      step: 'r0-03-mobile',
      summary,
      budget: BUDGET,
      runs: allRuns.map((r) => ({
        viewport: r.viewport,
        slowNet: r.slowNet,
        ms: r.ms,
        interactive: r.interactive,
        apiCalls: r.apiCalls,
        http5xx: r.http5xx,
        consoleErrors: r.consoleErrors.length,
        marks: r.marks,
        loadingStuck: r.loadingStuck,
      })),
    }, null, 2));

    if (failed.length) {
      console.error('[r0-03-mobile] FAIL', failed.map((f) => ({
        viewport: f.viewport,
        slowNet: f.slowNet,
        ms: f.ms,
        http5xx: f.http5xx,
        consoleErrors: f.consoleErrors,
      })));
      process.exit(1);
    }
    console.log('[r0-03-mobile] PASS');
  } finally {
    await http.close();
    await db.cleanup();
  }
}

main().catch((err) => {
  console.error('[r0-03-mobile]', err.message);
  process.exit(1);
});
