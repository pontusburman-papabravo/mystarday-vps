#!/usr/bin/env node
/**
 * R0-05 — child core mobile a11y smoke (PIN → Idag → substeps → complete).
 *
 * Usage:
 *   NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false node scripts/r0-05-child-mobile-a11y-smoke.mjs
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

const STEP_NAMES = ['R0A11ySub1', 'R0A11ySub2'];

async function auditPinKeypad(page) {
  await page.waitForSelector('#clKeypad button[data-action="1"]', { timeout: 20000 });
  return page.evaluate(() => {
    const keypad = document.getElementById('clKeypad');
    const keys = [...document.querySelectorAll('#clKeypad button[data-action]')];
    const digitKeys = keys.filter((b) => /^\d$/.test(b.getAttribute('data-action') || ''));
    const sizes = digitKeys.map((btn) => {
      const r = btn.getBoundingClientRect();
      return { w: r.width, h: r.height, action: btn.getAttribute('data-action') };
    });
    const minH = sizes.length ? Math.min(...sizes.map((s) => s.h)) : 0;
    const minW = sizes.length ? Math.min(...sizes.map((s) => s.w)) : 0;
    const keypadLabel = keypad ? keypad.getAttribute('aria-label') : null;
    const dots = document.getElementById('clPinDots');
    const dotsLabel = dots ? dots.getAttribute('aria-label') : null;
    return {
      digitCount: digitKeys.length,
      minTouchW: minW,
      minTouchH: minH,
      keypadAria: !!keypadLabel,
      pinDotsAria: !!dotsLabel,
    };
  });
}

async function auditToday(page, itemId, subStepId) {
  const cardSel = `#card-${itemId}`;
  await page.waitForSelector(cardSel, { timeout: 20000 });
  const base = await page.evaluate((sel, iId) => {
    const card = document.querySelector(sel) || document.querySelector(`[data-item-id="${iId}"]`);
    const schedule = document.getElementById('scheduleView');
    const nameEl = card && (card.querySelector('.photo-activity-card__title')
      || card.querySelector('.now-title')
      || card.querySelector('.activity-card .font-semibold')
      || card.querySelector('[data-item-name]'));
    const nameText = nameEl ? (nameEl.textContent || '').trim() : (card?.dataset?.itemName || '');
    const checkBtn = card && card.querySelector('.photo-activity-card__check, .card-check, .now-check');
    const checkAria = checkBtn ? checkBtn.getAttribute('aria-label') : null;
    const horizScroll = schedule ? schedule.scrollWidth > schedule.clientWidth + 2 : false;
    const cardRect = card ? card.getBoundingClientRect() : { width: 0, height: 0 };
    const checkRect = checkBtn ? checkBtn.getBoundingClientRect() : cardRect;
    return {
      hasName: nameText.length > 0,
      checkAria: !!checkAria,
      primaryTouchMin: Math.min(checkRect.width || cardRect.width, checkRect.height || cardRect.height),
      horizScroll,
      logoutVisible: !!(document.getElementById('logoutBtn') && document.getElementById('logoutBtn').offsetParent !== null),
      switchChildVisible: !!(document.getElementById('switchChildBtn') && document.getElementById('switchChildBtn').offsetParent !== null),
    };
  }, cardSel, itemId);

  await page.evaluate((iId) => {
    const ev = { stopPropagation() {}, preventDefault() {} };
    if (typeof window.expandSubSteps === 'function') window.expandSubSteps(ev, iId);
  }, itemId);
  await page.waitForSelector(`#substep-row-${subStepId}`, { timeout: 15000 }).catch(() => null);

  const sub = await page.evaluate((sId) => {
    const row = document.querySelector(`[data-substep-id="${sId}"]`)
      || document.querySelector(`#substep-row-${sId} .substep-row-primary`);
    const check = document.getElementById('substep-check-' + sId);
    const r = row ? row.getBoundingClientRect() : { width: 0, height: 0 };
    return {
      hasRow: !!row,
      ariaPressed: row ? row.getAttribute('aria-pressed') : null,
      roleButton: row ? row.getAttribute('role') === 'button' : false,
      hasCheckIcon: check ? check.classList.contains('checked') || !!check.querySelector('svg') : false,
      touchMin: Math.min(r.width, r.height),
    };
  }, subStepId);

  return { ...base, sub };
}

async function auditDoneStatus(page, itemId) {
  await page.evaluate((id) => {
    if (typeof window.toggleItem === 'function') window.toggleItem(id, false);
  }, itemId);
  await page.waitForFunction(
    (id) => {
      const card = document.getElementById('card-' + id);
      return card && (card.classList.contains('done') || card.querySelector('.photo-activity-card__check--done'));
    },
    { timeout: 15000 },
    itemId
  ).catch(() => null);

  return page.evaluate((id) => {
    const card = document.getElementById('card-' + id);
    if (!card) return { done: false, nonColorCue: false };
    const done = card.classList.contains('done');
    const svg = card.querySelector('.card-check svg, .photo-activity-card__check--done svg, .photo-activity-card__check svg');
    const checkText = (card.querySelector('.card-check, .photo-activity-card__check')?.textContent || '').trim();
    const ariaLabel = card.getAttribute('aria-label') || '';
    const nonColorCue = !!(svg || checkText.length > 0 || /klar|done|✓/i.test(ariaLabel)
      || card.querySelector('.photo-activity-card__check--done'));
    return { done, nonColorCue };
  }, itemId);
}

async function auditReducedMotionBurst(page, itemId) {
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  const rmActive = await page.evaluate(
    () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  if (!rmActive) {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
    return { particlesAdded: 0, rmActive: false };
  }
  const before = await page.evaluate(() => document.querySelectorAll('.dopamin-particle').length);
  await page.evaluate((id) => {
    if (typeof window.toggleItem === 'function') window.toggleItem(id, false);
  }, itemId);
  await new Promise((r) => setTimeout(r, 900));
  const after = await page.evaluate(() => document.querySelectorAll('.dopamin-particle').length);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  return { particlesAdded: Math.max(0, after - before), rmActive: true };
}

async function auditLargeText(page, itemId) {
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '125%';
  });
  await new Promise((r) => setTimeout(r, 300));
  return page.evaluate((id) => {
    const schedule = document.getElementById('scheduleView');
    const clipped = schedule ? schedule.scrollWidth > schedule.clientWidth + 4 : false;
    const card = document.getElementById('card-' + id) || document.querySelector(`[data-item-id="${id}"]`);
    const cr = card ? card.getBoundingClientRect() : { width: 0 };
    return { horizScroll: clipped, cardVisible: cr.width > 40 };
  }, itemId);
}

async function runFlow(puppeteer, baseUrl, ctx, viewport, minimalUi) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  const consoleErrors = [];
  const http5xx = [];
  page.on('pageerror', (e) => consoleErrors.push(String(e.message || e)));
  page.on('response', (res) => {
    if (res.url().includes('/api/') && res.status() >= 500) http5xx.push(res.status());
  });

  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });

  const knownChild = JSON.stringify({
    username: ctx.username,
    name: ctx.childName,
    emoji: '⭐',
    has_avatar: false,
    avatar_src: null,
    familyId: ctx.familyId,
  });
  await page.evaluateOnNewDocument((known, minimal) => {
    try {
      localStorage.setItem('stjarndag_known_children', known);
      localStorage.setItem('substepIntroSeen', '1');
      if (minimal) localStorage.setItem('r0_05_minimal_ui', '1');
    } catch (_) { /* ignore */ }
  }, `[${knownChild}]`, minimalUi);

  await page.goto(`${baseUrl}/child-login`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.evaluate((u) => {
    if (typeof window.selectChild === 'function') window.selectChild(u);
  }, ctx.username);

  const pinAudit = await auditPinKeypad(page);
  for (const digit of ctx.pin.split('')) {
    await page.click(`#clKeypad button[data-action="${digit}"]`);
    await new Promise((r) => setTimeout(r, 120));
  }
  await page.waitForFunction(
    () => document.getElementById('clSuccessBox')?.classList.contains('visible')
      || location.pathname.indexOf('/child/') === 0,
    { timeout: 12000 }
  ).catch(() => null);
  await page.waitForFunction(
    () => location.pathname.indexOf('/child/today') === 0,
    { timeout: 25000 }
  );
  await new Promise((r) => setTimeout(r, 800));
  await page.waitForSelector(`[data-item-id="${ctx.itemId}"]`, { timeout: 20000 });

  const todayAudit = await auditToday(page, ctx.itemId, ctx.subStep1);
  const textAudit = await auditLargeText(page, ctx.itemId);
  const motionAudit = await auditReducedMotionBurst(page, ctx.itemId);
  const doneAudit = await auditDoneStatus(page, ctx.itemId);

  await browser.close();

  const pass = pinAudit.digitCount >= 10
    && pinAudit.minTouchH >= 44
    && pinAudit.minTouchW >= 44
    && pinAudit.keypadAria
    && todayAudit.hasName
    && !todayAudit.horizScroll
    && (todayAudit.checkAria || todayAudit.primaryTouchMin >= 44 || todayAudit.sub.roleButton)
    && todayAudit.sub.hasRow
    && (todayAudit.sub.roleButton || todayAudit.sub.touchMin >= 44)
    && doneAudit.done
    && doneAudit.nonColorCue
    && motionAudit.rmActive !== false
    && motionAudit.particlesAdded === 0
    && !textAudit.horizScroll
    && consoleErrors.length === 0
    && (!minimalUi || (!todayAudit.logoutVisible && !todayAudit.switchChildVisible));

  return {
    viewport: viewport.name,
    minimalUi,
    pass,
    pinAudit,
    todayAudit,
    doneAudit,
    motionAudit,
    textAudit,
    http5xx: http5xx.length,
    consoleErrors,
  };
}

async function enableMinimalUi(db, familyId, childId, on) {
  await db.query(
    `INSERT INTO features (slug, name, status) VALUES ('minimal_ui', 'Minimal UI', 'live')
     ON CONFLICT (slug) DO UPDATE SET status = 'live'`
  );
  if (on) {
    await db.query(
      `INSERT INTO family_features (family_id, feature_slug) VALUES ($1, 'minimal_ui')
       ON CONFLICT DO NOTHING`,
      [familyId]
    );
    await db.query(
      `UPDATE child SET child_view_config = COALESCE(child_view_config, '{}'::jsonb) || '{"minimal_ui": true}'::jsonb WHERE id = $1`,
      [childId]
    );
  } else {
    await db.query(
      `UPDATE child SET child_view_config = COALESCE(child_view_config, '{}'::jsonb) || '{"minimal_ui": false}'::jsonb WHERE id = $1`,
      [childId]
    );
  }
}

async function main() {
  const puppeteer = await import('puppeteer').then((m) => m.default).catch(() => null);
  if (!puppeteer) {
    console.error('[r0-05-a11y] puppeteer missing');
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
    console.error('[r0-05-a11y] DATABASE_URL required');
    process.exit(2);
  }

  const http = await listenApp(createApp);
  const baseUrl = http.baseUrl;
  const dateStr = getLocalDateStr(new Date(), 'Europe/Stockholm');

  try {
    const session = await registerAndLogin(baseUrl);
    const pin = '2580';
    const childName = `R0A11y${Date.now().toString(36).slice(-4)}`;
    const childId = await createChild(baseUrl, session, {
      name: childName,
      pin,
      birthday: '2018-03-01',
    });
    const childRow = await db.query('SELECT username, family_id FROM child WHERE id = $1', [childId]);
    const { username, family_id: familyId } = childRow.rows[0];

    const tpl = await db.query(
      `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, source)
       VALUES ($1, 'R0A11yAkt', '⭐', 1, 0, 'user') RETURNING id`,
      [familyId]
    );
    const templateId = tpl.rows[0].id;
    const stepIds = [];
    for (let i = 0; i < STEP_NAMES.length; i++) {
      const ins = await db.query(
        `INSERT INTO activity_sub_step (activity_template_id, name, icon, sort_order)
         VALUES ($1, $2, '⭐', $3) RETURNING id`,
        [templateId, STEP_NAMES[i], i]
      );
      stepIds.push(ins.rows[0].id);
    }
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
       VALUES ($1, $2, 'R0A11yAkt', '⭐', 1, 0, 'morgon') RETURNING id`,
      [logRes.rows[0].id, templateId]
    );
    const itemId = itemRes.rows[0].id;

    const ctx = {
      username, childName, pin, itemId, subStep1: stepIds[0], familyId, childId,
    };

    const runs = [];
    for (const minimalUi of [false, true]) {
      await enableMinimalUi(db, familyId, childId, minimalUi);
      await db.query(
        'UPDATE daily_log_item SET completed = false, completed_at = NULL, completed_by = NULL WHERE id = $1',
        [itemId]
      );
      for (const vp of VIEWPORTS) {
        runs.push(await runFlow(puppeteer, baseUrl, ctx, vp, minimalUi));
      }
    }

    console.log(JSON.stringify({ step: 'r0-05-mobile-a11y', runs }, null, 2));
    const failed = runs.filter((r) => !r.pass);
    if (failed.length) {
      console.error('[r0-05-a11y] FAIL', failed.map((f) => ({
        viewport: f.viewport,
        minimalUi: f.minimalUi,
        motionAudit: f.motionAudit,
        pinAudit: f.pinAudit,
        todayAudit: f.todayAudit,
        doneAudit: f.doneAudit,
        consoleErrors: f.consoleErrors,
      })));
      process.exit(1);
    }
    console.log('[r0-05-a11y] PASS');
  } finally {
    await http.close();
    await db.cleanup();
  }
}

main().catch((err) => {
  console.error('[r0-05-a11y]', err.message);
  process.exit(1);
});
