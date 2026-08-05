#!/usr/bin/env node
/**
 * R2 — activity timer lifecycle (pause/refresh/resume/zero/two timers/reset).
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
    await new Promise((r) => setTimeout(r, 80));
  }
  await page.waitForFunction(
    () => location.pathname.indexOf('/child/today') === 0,
    { timeout: 45000 }
  );
  await new Promise((r) => setTimeout(r, 2000));
}

function parseRemaining(text) {
  if (!text || text === '0:00') return 0;
  const m = text.match(/^0:(\d+)$/);
  if (m) return parseInt(m[1], 10);
  const m2 = text.match(/^(\d+):(\d+)$/);
  if (m2) return parseInt(m2[1], 10) * 60 + parseInt(m2[2], 10);
  return null;
}

async function readSession(page, itemId) {
  return page.evaluate((itemId) => {
    const childId = (typeof me !== 'undefined' && me && me.id) ? me.id : null;
    const dateStr = typeof currentDate !== 'undefined' ? currentDate : null;
    if (!childId || !dateStr) return null;
    const prefix = `activity_timer_session:${childId}:${dateStr}:${itemId}`;
    const raw = localStorage.getItem(prefix);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, itemId);
}

async function timerSessionAction(page, itemId, action) {
  await page.evaluate((itemId, action) => {
    const wrap = document.querySelector(`.activity-timer-wrap[data-item-id="${itemId}"]`);
    if (!wrap || typeof ActivityTimerSession === 'undefined') throw new Error('timer unavailable');
    const duration = parseInt(wrap.dataset.duration, 10);
    if (action === 'pause') {
      ActivityTimerSession.pauseSession(me.id, currentDate, itemId, duration);
    } else if (action === 'resume') {
      ActivityTimerSession.resumeSession(me.id, currentDate, itemId);
    } else if (action === 'restart') {
      ActivityTimerSession.startSession(me.id, currentDate, itemId, duration, undefined, { force: true });
    }
    if (typeof ChildActivityTimer !== 'undefined' && ChildActivityTimer.tickAll) {
      ChildActivityTimer.tickAll();
    }
  }, itemId, action);
  await new Promise((r) => setTimeout(r, 200));
}

async function clickTimerAction(page, itemId, action, stepLabel) {
  if (action === 'start') {
    const start = await page.$(`.activity-timer-wrap[data-item-id="${itemId}"] .activity-timer-start`);
    if (!start) throw new Error(`${stepLabel}: missing start`);
    await start.click();
    return;
  }
  if (action === 'pause' || action === 'resume' || action === 'restart') {
    await timerSessionAction(page, itemId, action);
    return;
  }
  await page.evaluate((id) => {
    const btn = document.querySelector(`.activity-timer-compact-btn[data-item-id="${id}"]`);
    if (btn) btn.click();
  }, itemId);
  await page.waitForSelector('#activity-timer-overlay:not([hidden])', { timeout: 8000 });
  await page.evaluate((act, step) => {
    const btn = document.querySelector(`#activity-timer-overlay [data-action="${act}"]`);
    if (!btn || btn.hidden) {
      const statusEl = document.querySelector('#activity-timer-overlay-status');
      throw new Error((step || '') + ' action unavailable: ' + act + ' overlayStatus=' + (statusEl && statusEl.textContent));
    }
    btn.click();
  }, action, stepLabel);
  await new Promise((r) => setTimeout(r, 300));
}

async function readDigits(page, itemId) {
  return page.evaluate((id) => {
    const wrap = document.querySelector(`.activity-timer-wrap[data-item-id="${id}"]`);
    const digits = wrap && wrap.querySelector('.activity-timer-digits');
    return digits ? digits.textContent.trim() : null;
  }, itemId);
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

  const checks = {
    pauseRefresh: false,
    resume: false,
    doubleResume: false,
    naturalZero: false,
    twoTimers: false,
    reset: false,
    noTimerActivity: false,
  };

  await childLogin(page, baseUrl, ctx.username, ctx.pin, ctx.childName, ctx.familyId);
  const { itemA, itemB, itemC, childId, dateStr } = ctx;

  await clickTimerAction(page, itemA, 'start', 'A-start');
  await page.waitForFunction((itemId) => {
    const childId = (typeof me !== 'undefined' && me && me.id) ? me.id : null;
    const dateStr = typeof currentDate !== 'undefined' ? currentDate : null;
    if (!childId || !dateStr) return false;
    const k = `activity_timer_session:${childId}:${dateStr}:${itemId}`;
    return !!localStorage.getItem(k);
  }, { timeout: 15000 }, itemA);
  await page.waitForFunction((id) => {
    const w = document.querySelector(`.activity-timer-wrap[data-item-id="${id}"]`);
    return w && w.dataset.status === 'running';
  }, { timeout: 15000 }, itemA);
  await new Promise((r) => setTimeout(r, 2000));
  await clickTimerAction(page, itemA, 'pause', 'A-pause');
  await page.waitForFunction((id) => {
    const w = document.querySelector(`.activity-timer-wrap[data-item-id="${id}"]`);
    return w && w.dataset.status === 'paused';
  }, { timeout: 15000 }, itemA);
  const pausedSession = await readSession(page, itemA);
  const pausedRem = pausedSession && pausedSession.paused_remaining_seconds != null
    ? Math.ceil(pausedSession.paused_remaining_seconds)
    : null;
  const digitsPaused = parseRemaining(await readDigits(page, itemA));
  await new Promise((r) => setTimeout(r, 2500));
  const digitsAfterWait = parseRemaining(await readDigits(page, itemA));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction((id) => {
    const w = document.querySelector(`.activity-timer-wrap[data-item-id="${id}"]`);
    return w && w.dataset.status === 'paused';
  }, { timeout: 20000 }, itemA);
  await new Promise((r) => setTimeout(r, 500));
  const storageDebug = await page.evaluate(() => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('activity_timer_session:')) keys.push(k);
    }
    return {
      keys,
      currentDate: typeof currentDate !== 'undefined' ? currentDate : null,
      childId: (typeof me !== 'undefined' && me && me.id) ? me.id : null,
    };
  });
  if (!storageDebug.keys.length) {
    throw new Error('no timer sessions after reload: ' + JSON.stringify(storageDebug));
  }
  const afterRefreshSession = await readSession(page, itemA);
  const digitsAfterRefresh = parseRemaining(await readDigits(page, itemA));
  checks.pauseRefresh = pausedSession && pausedSession.status === 'paused'
    && pausedSession.ends_at == null
    && pausedRem != null && pausedRem >= 5 && pausedRem <= 7
    && digitsPaused != null && Math.abs(digitsPaused - pausedRem) <= 1
    && digitsAfterWait != null && Math.abs(digitsAfterWait - pausedRem) <= 1
    && afterRefreshSession && afterRefreshSession.status === 'paused'
    && digitsAfterRefresh != null && Math.abs(digitsAfterRefresh - pausedRem) <= 1;

  const endsBeforeResume = afterRefreshSession && afterRefreshSession.ends_at;
  await clickTimerAction(page, itemA, 'resume', 'A-resume-after-refresh');
  const resumed = await readSession(page, itemA);
  const remAfterResume = parseRemaining(await readDigits(page, itemA));
  const endsAfterFirstResume = resumed && resumed.ends_at;
  await page.evaluate((id) => {
    document.querySelector(`.activity-timer-compact-btn[data-item-id="${id}"]`).click();
  }, itemA);
  await page.waitForSelector('#activity-timer-overlay:not([hidden])', { timeout: 8000 });
  const doubleResumeUi = await page.evaluate(() => {
    const resumeBtn = document.querySelector('#activity-timer-overlay [data-action="resume"]');
    return { resumeHidden: !!(resumeBtn && resumeBtn.hidden) };
  });
  await page.evaluate(() => {
    const close = document.querySelector('.activity-timer-overlay__close');
    if (close) close.click();
  });
  const afterDoubleResume = await readSession(page, itemA);
  const remDouble = parseRemaining(await readDigits(page, itemA));
  checks.resume = resumed && resumed.status === 'running' && resumed.ends_at
    && remAfterResume != null && Math.abs(remAfterResume - pausedRem) <= 2;
  checks.doubleResume = doubleResumeUi.resumeHidden
    && afterDoubleResume && afterDoubleResume.ends_at === endsAfterFirstResume
    && remDouble != null && Math.abs(remDouble - remAfterResume) <= 1;

  await clickTimerAction(page, itemA, 'restart', 'A-restart-before-two-timers');
  await page.waitForFunction((id) => {
    const w = document.querySelector(`.activity-timer-wrap[data-item-id="${id}"]`);
    return w && w.dataset.status === 'running';
  }, { timeout: 15000 }, itemA);

  await page.evaluate((id) => {
    const el = document.querySelector(`.activity-timer-wrap[data-item-id="${id}"]`);
    if (el) el.scrollIntoView({ block: 'center', inline: 'nearest' });
  }, itemB);
  await page.evaluate((itemId) => {
    const wrap = document.querySelector(`.activity-timer-wrap[data-item-id="${itemId}"]`);
    if (!wrap) throw new Error('timer wrap missing for ' + itemId);
    const duration = parseInt(wrap.dataset.duration, 10);
    ActivityTimerSession.startSession(me.id, currentDate, itemId, duration);
    if (typeof ChildActivityTimer !== 'undefined' && ChildActivityTimer.tickAll) ChildActivityTimer.tickAll();
  }, itemB);
  await page.waitForFunction((itemId) => {
    const childId = (typeof me !== 'undefined' && me && me.id) ? me.id : null;
    const dateStr = typeof currentDate !== 'undefined' ? currentDate : null;
    if (!childId || !dateStr) return false;
    const k = `activity_timer_session:${childId}:${dateStr}:${itemId}`;
    return !!localStorage.getItem(k);
  }, { timeout: 15000 }, itemB);
  const bRunning = await readSession(page, itemB);
  await clickTimerAction(page, itemA, 'pause', 'A-pause-during-B');
  await new Promise((r) => setTimeout(r, 1500));
  const aPaused = await readSession(page, itemA);
  await new Promise((r) => setTimeout(r, 12000));
  await page.evaluate(() => {
    if (typeof ChildActivityTimer !== 'undefined' && ChildActivityTimer.tickAll) ChildActivityTimer.tickAll();
  });
  await new Promise((r) => setTimeout(r, 500));
  const bFinished = await readSession(page, itemB);
  const aStill = await readSession(page, itemA);
  checks.twoTimers = Boolean(bRunning && bRunning.status === 'running'
    && aPaused && aPaused.status === 'paused'
    && bFinished && (bFinished.status === 'finished' || bFinished.ended_at)
    && aStill && aStill.status === 'paused');
  checks.naturalZero = Boolean(bFinished && (bFinished.status === 'finished' || bFinished.ended_at));

  await clickTimerAction(page, itemA, 'restart', 'A-restart-reset-test');
  const aAfterReset = await readSession(page, itemA);
  const bAfterReset = await readSession(page, itemB);
  checks.reset = Boolean(aAfterReset && aAfterReset.status === 'running'
    && parseRemaining(await readDigits(page, itemA)) >= 5
    && bAfterReset && (bAfterReset.status === 'finished' || bAfterReset.end_sound_played || bAfterReset.ended_at));

  const cWrap = await page.$(`.activity-timer-wrap[data-item-id="${itemC}"] .activity-timer-start`);
  const cCompleteBefore = await page.evaluate((id) => {
    const card = document.querySelector(`[data-daily-log-item-id="${id}"]`);
    return card ? card.classList.contains('completed') : false;
  }, itemC);
  checks.noTimerActivity = !cWrap && !cCompleteBefore;

  await browser.close();

  const pass = Object.values(checks).every(Boolean)
    && http5xx.length === 0 && consoleErrors.length === 0;

  return {
    viewport: viewport.name,
    pass,
    checks,
    http5xx,
    consoleErrors,
    endsBeforeResume,
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
    const childId = await createChild(baseUrl, session, { name: 'LifeBarn' });
    await db.query(
      `UPDATE child SET username = 'r2life', pin = $1, activity_timers_enabled = true WHERE id = $2`,
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
    const tplA = await mkTpl('R2 A 8s', 8);
    const tplB = await mkTpl('R2 B 12s', 12);
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
    const itemA = await ins(tplA, 'R2 A 8s', 0);
    const itemB = await ins(tplB, 'R2 B 12s', 1);
    const itemC = await ins(tplC, 'R2 C plain', 2);

    const ctx = {
      username: 'r2life', pin, childName: 'LifeBarn', familyId, childId, dateStr, itemA, itemB, itemC,
    };
    const results = [];
    for (const vp of VIEWPORTS) {
      results.push(await runViewport(puppeteer, baseUrl, ctx, vp));
    }

    console.log(JSON.stringify({ step: 'r2-activity-timer-lifecycle-smoke', results }, null, 2));
    if (results.some((r) => !r.pass)) process.exit(1);
    console.log('[r2-timer-lifecycle] PASS');
  } finally {
    await http.close();
    await db.cleanup();
  }
}

main().catch((e) => {
  console.error('[r2-timer-lifecycle]', e.message);
  process.exit(1);
});
