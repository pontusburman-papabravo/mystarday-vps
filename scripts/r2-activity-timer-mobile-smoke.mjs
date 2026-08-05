#!/usr/bin/env node
/**
 * R2 — activity timer mobile smoke (synthetic family, both viewports).
 *
 *   NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false node scripts/r2-activity-timer-mobile-smoke.mjs
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

async function runViewport(puppeteer, baseUrl, { username, pin, itemId, familyId, childName, viewport }) {
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
    if (res.status() >= 500 && res.url().includes('/api/')) {
      http5xx.push(res.status());
    }
  });

  const knownChild = JSON.stringify({
    username,
    name: childName,
    emoji: '⭐',
    has_avatar: false,
    avatar_src: null,
    familyId,
  });
  await page.evaluateOnNewDocument((known) => {
    try {
      localStorage.setItem('stjarndag_known_children', known);
      localStorage.setItem('substepIntroSeen', '1');
    } catch (_) { /* ignore */ }
  }, `[${knownChild}]`);

  await page.goto(`${baseUrl}/child-login`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.evaluate((u) => {
    if (typeof window.selectChild === 'function') window.selectChild(u);
  }, username);
  await page.waitForSelector('#clKeypad button[data-action="1"]', { timeout: 15000 });
  for (const digit of pin.split('')) {
    await page.click(`#clKeypad button[data-action="${digit}"]`);
    await new Promise((r) => setTimeout(r, 120));
  }
  await page.waitForFunction(
    () => document.getElementById('clSuccessBox')?.classList.contains('visible')
      || location.pathname.indexOf('/child/') === 0,
    { timeout: 15000 }
  );
  await page.waitForFunction(
    () => location.pathname.indexOf('/child/today') === 0,
    { timeout: 45000 }
  );
  await new Promise((r) => setTimeout(r, 3000));

  const beforeStart = await page.evaluate((id) => {
    const wrap = document.querySelector(`.activity-timer-wrap[data-item-id="${id}"]`);
    const start = wrap && wrap.querySelector('.activity-timer-start');
    return {
      hasTimerWrap: !!wrap,
      hasStart: !!start,
      startVisible: !!(start && start.offsetParent),
    };
  }, itemId);

  const startBtn = await page.$(`.activity-timer-wrap[data-item-id="${itemId}"] .activity-timer-start`);
  if (startBtn) await startBtn.click();
  await new Promise((r) => setTimeout(r, 1500));

  const afterStart = await page.evaluate((id) => {
    const wrap = document.querySelector(`.activity-timer-wrap[data-item-id="${id}"]`);
    const digits = wrap && wrap.querySelector('.activity-timer-digits');
    const start = wrap && wrap.querySelector('.activity-timer-start');
    return {
      digits: digits ? digits.textContent.trim() : null,
      startHidden: !start || !start.offsetParent,
    };
  }, itemId);

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 3000));

  const afterRefresh = await page.evaluate((id) => {
    const wrap = document.querySelector(`.activity-timer-wrap[data-item-id="${id}"]`);
    const digits = wrap && wrap.querySelector('.activity-timer-digits');
    return { digits: digits ? digits.textContent.trim() : null, hasWrap: !!wrap };
  }, itemId);

  const plainItem = await page.evaluate(() => {
    const items = [...document.querySelectorAll('[data-item-id]')];
    const without = items.find((el) => !el.querySelector('.activity-timer-wrap'));
    return { plainExists: !!without };
  });

  await browser.close();

  const pass = beforeStart.hasTimerWrap
    && beforeStart.hasStart
    && beforeStart.startVisible
    && afterStart.startHidden
    && afterRefresh.hasWrap
    && plainItem.plainExists
    && http5xx.length === 0
    && consoleErrors.length === 0;

  return {
    viewport: viewport.name,
    pass,
    beforeStart,
    afterStart,
    afterRefresh,
    plainItem,
    http5xx,
    consoleErrors,
  };
}

async function main() {
  const puppeteer = await import('puppeteer').then((m) => m.default).catch(() => null);
  if (!puppeteer) {
    console.error('[r2-timer-mobile] puppeteer missing');
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
  const { hashPassword } = require(path.join(ROOT, 'src/lib/hash'));
  const { getLocalDateStr } = require(path.join(ROOT, 'src/lib/daily-log-generator'));

  const db = await setupTestDb();
  if (db.skip) {
    console.error('[r2-timer-mobile] DATABASE_URL required');
    process.exit(2);
  }

  const http = await listenApp(createApp);
  const baseUrl = http.baseUrl;
  const dateStr = getLocalDateStr(new Date(), 'Europe/Stockholm');
  const pin = '4821';

  try {
    const session = await registerAndLogin(baseUrl);
    const childId = await createChild(baseUrl, session, { name: 'TimerBarn' });
    await db.query(
      `UPDATE child SET username = 'r2timer', pin = $1, activity_timers_enabled = true WHERE id = $2`,
      [await hashPassword(pin), childId]
    );
    const fam = await db.query('SELECT family_id FROM child WHERE id = $1', [childId]);
    const familyId = fam.rows[0].family_id;

    const tpl = await db.query(
      `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, duration_seconds, source)
       VALUES ($1, 'R2 Timer 2m', '⏱️', 1, 0, 120, 'user') RETURNING id`,
      [familyId]
    );
    await db.query(
      `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, duration_seconds, source)
       VALUES ($1, 'R2 Plain', '⭐', 1, 1, NULL, 'user')`,
      [familyId]
    );
    await db.query('DELETE FROM daily_log WHERE child_id = $1 AND date = $2', [childId, dateStr]);
    const logRes = await db.query(
      'INSERT INTO daily_log (child_id, date) VALUES ($1, $2) RETURNING id',
      [childId, dateStr]
    );
    const itemRes = await db.query(
      `INSERT INTO daily_log_item
         (daily_log_id, activity_template_id, name, icon, star_value, sort_order, section)
       VALUES ($1, $2, 'R2 Timer 2m', '⏱️', 1, 0, 'morgon') RETURNING id`,
      [logRes.rows[0].id, tpl.rows[0].id]
    );
    await db.query(
      `INSERT INTO daily_log_item
         (daily_log_id, activity_template_id, name, icon, star_value, sort_order, section)
       SELECT $1, id, 'R2 Plain', '⭐', 1, 1, 'morgon' FROM activity_template
       WHERE family_id = $2 AND name = 'R2 Plain' LIMIT 1`,
      [logRes.rows[0].id, familyId]
    );

    const results = [];
    for (const vp of VIEWPORTS) {
      results.push(await runViewport(puppeteer, baseUrl, {
        username: 'r2timer',
        pin,
        itemId: itemRes.rows[0].id,
        familyId,
        childName: 'TimerBarn',
        viewport: vp,
      }));
    }

    console.log(JSON.stringify({ step: 'r2-activity-timer-mobile', results }, null, 2));
    if (results.some((r) => !r.pass)) {
      console.error('[r2-timer-mobile] FAIL');
      process.exit(1);
    }
    console.log('[r2-timer-mobile] PASS');
  } finally {
    await http.close();
    await db.cleanup();
  }
}

main().catch((err) => {
  console.error('[r2-timer-mobile]', err.message);
  process.exit(1);
});
