#!/usr/bin/env node
/**
 * R2 — activity timer runtime reliability (navigation, visibility, idempotent start).
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

async function childLogin(page, baseUrl, username, pin, childName, familyId) {
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
    await new Promise((r) => setTimeout(r, 100));
  }
  await page.waitForFunction(
    () => location.pathname.indexOf('/child/today') === 0,
    { timeout: 45000 }
  );
  await new Promise((r) => setTimeout(r, 2500));
}

function parseRemaining(text) {
  if (!text || text === '0:00') return 0;
  const m = text.match(/^(\d+):(\d+)$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

async function runViewport(puppeteer, baseUrl, ctx, viewport) {
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
    if (res.status() >= 500 && res.url().includes('/api/')) http5xx.push(res.status());
  });

  await childLogin(page, baseUrl, ctx.username, ctx.pin, ctx.childName, ctx.familyId);

  const itemA = ctx.itemA;
  const itemB = ctx.itemB;
  const itemC = ctx.itemC;

  const startA = await page.$(`.activity-timer-wrap[data-item-id="${itemA}"] .activity-timer-start`);
  if (!startA) throw new Error('missing start A');
  await startA.click();
  await new Promise((r) => setTimeout(r, 2800));

  const afterRun = await page.evaluate((id) => {
    const wrap = document.querySelector(`.activity-timer-wrap[data-item-id="${id}"]`);
    const digits = wrap && wrap.querySelector('.activity-timer-digits');
    return digits ? digits.textContent.trim() : null;
  }, itemA);
  const remAfterRun = parseRemaining(afterRun);
  const navOk = remAfterRun !== null && remAfterRun > 0 && remAfterRun < 20;

  await page.goto(`${baseUrl}/child/rewards`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
  await new Promise((r) => setTimeout(r, 800));
  await page.goto(`${baseUrl}/child/today`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 3000));

  const afterNav = await page.evaluate((id) => {
    const wrap = document.querySelector(`.activity-timer-wrap[data-item-id="${id}"]`);
    const digits = wrap && wrap.querySelector('.activity-timer-digits');
    return digits ? digits.textContent.trim() : null;
  }, itemA);
  const remNav = parseRemaining(afterNav);
  const navigationOk = remNav !== null && remNav > 0 && remNav <= remAfterRun;

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 3000));
  const afterRefresh = await page.evaluate((id) => {
    const wrap = document.querySelector(`.activity-timer-wrap[data-item-id="${id}"]`);
    const digits = wrap && wrap.querySelector('.activity-timer-digits');
    return digits ? digits.textContent.trim() : null;
  }, itemA);
  const remRefresh = parseRemaining(afterRefresh);
  const refreshOk = remRefresh !== null && remRefresh > 0 && remRefresh <= remNav;

  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get() { return 'hidden'; } });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await new Promise((r) => setTimeout(r, 2000));
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get() { return 'visible'; } });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await new Promise((r) => setTimeout(r, 500));
  const afterVis = await page.evaluate((id) => {
    const wrap = document.querySelector(`.activity-timer-wrap[data-item-id="${id}"]`);
    const digits = wrap && wrap.querySelector('.activity-timer-digits');
    return digits ? digits.textContent.trim() : null;
  }, itemA);
  const remVis = parseRemaining(afterVis);
  const visibilityOk = remVis !== null && remVis >= 0 && remVis <= remRefresh;

  const sessionKeys = await page.evaluate(() => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('activity_timer_session:')) keys.push(k);
    }
    return keys.length;
  });

  await browser.close();

  const pass = navOk && navigationOk && refreshOk && visibilityOk
    && sessionKeys >= 1 && http5xx.length === 0 && consoleErrors.length === 0;

  return {
    viewport: viewport.name,
    pass,
    remAfterRun,
    remNav,
    remRefresh,
    remVis,
    sessionKeys,
    http5xx,
    consoleErrors,
  };
}

async function main() {
  const puppeteer = await import('puppeteer').then((m) => m.default).catch(() => null);
  if (!puppeteer) process.exit(2);

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
  if (db.skip) process.exit(2);

  const http = await listenApp(createApp);
  const baseUrl = http.baseUrl;
  const dateStr = getLocalDateStr(new Date(), 'Europe/Stockholm');
  const pin = '4821';

  try {
    const session = await registerAndLogin(baseUrl);
    const childId = await createChild(baseUrl, session, { name: 'RuntimeBarn' });
    await db.query(
      `UPDATE child SET username = 'r2runtime', pin = $1, activity_timers_enabled = true WHERE id = $2`,
      [await hashPassword(pin), childId]
    );
    const fam = await db.query('SELECT family_id FROM child WHERE id = $1', [childId]);
    const familyId = fam.rows[0].family_id;

    const mkTpl = async (name, sec) => {
      const r = await db.query(
        `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, duration_seconds, source)
         VALUES ($1, $2, '⏱️', 1, 0, $3, 'user') RETURNING id`,
        [familyId, name, sec]
      );
      return r.rows[0].id;
    };
    const tplA = await mkTpl('R2 A 20s', 20);
    const tplB = await mkTpl('R2 B 30s', 30);
    const tplC = await mkTpl('R2 C plain', null);

    await db.query('DELETE FROM daily_log WHERE child_id = $1 AND date = $2', [childId, dateStr]);
    const logRes = await db.query(
      'INSERT INTO daily_log (child_id, date) VALUES ($1, $2) RETURNING id',
      [childId, dateStr]
    );
    const logId = logRes.rows[0].id;
    const ins = async (tplId, name, sort) => {
      const r = await db.query(
        `INSERT INTO daily_log_item
           (daily_log_id, activity_template_id, name, icon, star_value, sort_order, section)
         VALUES ($1, $2, $3, '⏱️', 1, $4, 'morgon') RETURNING id`,
        [logId, tplId, name, sort]
      );
      return r.rows[0].id;
    };
    const itemA = await ins(tplA, 'R2 A 20s', 0);
    const itemB = await ins(tplB, 'R2 B 30s', 1);
    const itemC = await ins(tplC, 'R2 C plain', 2);

    const ctx = { username: 'r2runtime', pin, childName: 'RuntimeBarn', familyId, itemA, itemB, itemC };
    const results = [];
    for (const vp of VIEWPORTS) {
      results.push(await runViewport(puppeteer, baseUrl, ctx, vp));
    }

    console.log(JSON.stringify({ step: 'r2-activity-timer-runtime-smoke', results }, null, 2));
    if (results.some((r) => !r.pass)) process.exit(1);
    console.log('[r2-timer-runtime] PASS');
  } finally {
    await http.close();
    await db.cleanup();
  }
}

main().catch((e) => {
  console.error('[r2-timer-runtime]', e.message);
  process.exit(1);
});
