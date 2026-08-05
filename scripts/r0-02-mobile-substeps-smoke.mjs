#!/usr/bin/env node
/**
 * R0-02 mobile smoke: expand substeps → tap progression on Idag (touch).
 * Viewports: 390×844, 412×915.
 *
 * Usage:
 *   NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false node scripts/r0-02-mobile-substeps-smoke.mjs
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

const STEP_NAMES = ['R0MobSub1', 'R0MobSub2', 'R0MobSub3'];

async function hydrateChildPage(page, baseUrl, meUser, cookies, csrf) {
  const userJson = JSON.stringify(meUser);
  await page.evaluateOnNewDocument((u, c) => {
    try {
      localStorage.setItem('stjarndag_user', u);
      localStorage.setItem('stjarndag_device_mode', 'child');
      localStorage.setItem('substepIntroSeen', '1');
      if (c) localStorage.setItem('stjarndag_csrf', c);
    } catch (_) { /* ignore */ }
  }, userJson, csrf || '');
  await page.setCookie(
    ...Object.entries(cookies).map(([name, value]) => ({
      name,
      value: String(value),
      url: baseUrl,
    }))
  );
}

async function readSubstepState(page, stepIds) {
  return page.evaluate((ids) => {
    const rows = ids.map((id) => {
      const primary = document.querySelector(`[data-substep-id="${id}"]`);
      const check = document.getElementById('substep-check-' + id);
      return {
        id,
        ariaPressed: primary ? primary.getAttribute('aria-pressed') : null,
        checked: check ? check.classList.contains('checked') : false,
        box: primary ? (() => {
          const r = primary.getBoundingClientRect();
          return { w: r.width, h: r.height };
        })() : null,
      };
    });
    return rows;
  }, stepIds);
}

function isStepDone(row) {
  return row.checked || row.ariaPressed === 'true';
}

async function waitStepDone(page, stepId) {
  await page.waitForFunction(
    (id) => {
      const check = document.getElementById('substep-check-' + id);
      if (check && check.classList.contains('checked')) return true;
      const el = document.querySelector(`[data-substep-id="${id}"]`);
      return el && el.getAttribute('aria-pressed') === 'true';
    },
    { timeout: 15000 },
    stepId
  );
}

async function tapSubstep(page, itemId, stepId) {
  const sel = `#substep-row-${stepId} [data-substep-id]`;
  await page.waitForSelector(sel, { timeout: 15000 });
  const handle = await page.$(sel);
  if (handle) await handle.tap().catch(() => handle.click());
  const ok = await page.evaluate((iId, sId) => {
    const row = document.querySelector(`[data-substep-id="${sId}"]`);
    if (!row || typeof window.toggleSubStep !== 'function') return false;
    row.scrollIntoView({ block: 'center', inline: 'nearest' });
    const rowDone = row.getAttribute('data-substep-done') === '1';
    let isDone = rowDone;
    if (window.subStepCache && window.subStepCache[iId]) {
      const step = window.subStepCache[iId].find((s) => String(s.id) === String(sId));
      if (step) isDone = !!step.completed;
    }
    window.toggleSubStep({ stopPropagation() {}, preventDefault() {} }, iId, sId, isDone);
    return true;
  }, itemId, stepId);
  if (!ok) throw new Error(`toggleSubStep unavailable for ${stepId}`);
  await page.waitForFunction(
    (id) => {
      const row = document.getElementById('substep-row-' + id);
      return row && !row.classList.contains('pending');
    },
    { timeout: 12000 },
    stepId
  );
}

async function main() {
  const puppeteer = await import('puppeteer').then((m) => m.default).catch(() => null);
  if (!puppeteer) {
    console.error('[r0-02-mobile] puppeteer missing');
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
  const { registerAndLogin, createChild } = require(path.join(ROOT, 'test/helpers/auth-session.js'));
  const { childLoginRaw } = require(path.join(ROOT, 'test/helpers/golden-path-fas6.js'));
  const { getLocalDateStr } = require(path.join(ROOT, 'src/lib/daily-log-generator'));

  const db = await setupTestDb();
  if (db.skip) {
    console.error('[r0-02-mobile] DATABASE_URL required');
    process.exit(2);
  }

  const http = await listenApp(createApp);
  const baseUrl = http.baseUrl;
  const dateStr = getLocalDateStr(new Date(), 'Europe/Stockholm');

  try {
    const session = await registerAndLogin(baseUrl);
    const pin = String(4000 + Math.floor(Math.random() * 4000)).replace(/1234/, '2580');
    const childId = await createChild(baseUrl, session, {
      name: `R0SubMob${Date.now().toString(36)}`,
      pin,
      birthday: '2018-01-15',
    });
    const childRow = await db.query('SELECT username, family_id FROM child WHERE id = $1', [childId]);
    const { username, family_id: familyId } = childRow.rows[0];

    const tpl = await db.query(
      `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, source)
       VALUES ($1, 'R0MobKlä', '👕', 1, 0, 'user') RETURNING id`,
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
    if (stepIds.length !== 3) throw new Error('expected three sub-steps');
    const [subStep1, subStep2, subStep3] = stepIds;

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
       VALUES ($1, $2, 'R0MobKlä', '👕', 1, 0, 'morgon') RETURNING id`,
      [logRes.rows[0].id, templateId]
    );
    const itemId = itemRes.rows[0].id;

    const cl = await childLoginRaw(baseUrl, { username, pin });
    if (cl.status !== 200) throw new Error(`child login ${cl.status}`);
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(cl.cookies) },
    });
    if (!meRes.ok) throw new Error(`me ${meRes.status}`);
    const meUser = await meRes.json();

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const results = [];
    for (const vp of VIEWPORTS) {
      if (results.length > 0) {
        await db.query('DELETE FROM daily_log_item_sub_step WHERE daily_log_item_id = $1', [itemId]);
        await db.query(
          'UPDATE daily_log_item SET completed = false, completed_at = NULL, completed_by = NULL WHERE id = $1',
          [itemId]
        );
      }
      const page = await browser.newPage();
      await page.setViewport({
        width: vp.width,
        height: vp.height,
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      });
      await hydrateChildPage(page, baseUrl, meUser, cl.cookies, cl.csrfToken);
      await page.goto(`${baseUrl}/child/today`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForSelector(`#expand-btn-${itemId}`, { timeout: 25000 });
      await page.$eval(`#expand-btn-${itemId}`, (el) => {
        el.scrollIntoView({ block: 'center', inline: 'nearest' });
        el.click();
      });
      await page.waitForResponse(
        (res) => res.url().includes(`/daily-log-items/${itemId}/sub-steps`) && res.status() === 200,
        { timeout: 20000 }
      ).catch(() => null);
      await page.waitForSelector(`[data-substep-id="${subStep1}"]`, { timeout: 20000 });

      let state = await readSubstepState(page, stepIds);
      const touchOk = state.every((s) => s.box && s.box.h >= 44 && s.box.w >= 44);
      const a11yOk = state.every((s) => s.ariaPressed === 'true' || s.ariaPressed === 'false');

      await tapSubstep(page, itemId, subStep1);
      await waitStepDone(page, subStep1);

      await tapSubstep(page, itemId, subStep2);
      await waitStepDone(page, subStep2);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector(`#expand-btn-${itemId}`, { timeout: 25000 });
      await page.$eval(`#expand-btn-${itemId}`, (el) => {
        el.scrollIntoView({ block: 'center', inline: 'nearest' });
        el.click();
      });
      await page.waitForSelector(`[data-substep-id="${subStep2}"]`, { timeout: 20000 });

      state = await readSubstepState(page, stepIds);
      const afterRefresh = {
        step0: isStepDone(state[0]),
        step1: isStepDone(state[1]),
        step2: !isStepDone(state[2]),
      };

      await tapSubstep(page, itemId, subStep3);
      await waitStepDone(page, subStep3);
      await page.waitForFunction(
        (id) => {
          const card = document.getElementById('card-' + id);
          return card && card.classList.contains('done');
        },
        { timeout: 20000 },
        itemId
      ).catch(() => null);

      const apiRes = await fetch(`${baseUrl}/api/me/daily-log-items/${itemId}/sub-steps`, {
        headers: { Cookie: cookieHeader(cl.cookies) },
      });
      const apiBody = await apiRes.json();
      const apiDone = (apiBody.sub_steps || []).filter((s) => s.completed).map((s) => s.id);
      const apiMatch = JSON.stringify(apiDone) === JSON.stringify(stepIds);

      let activityCompleted = false;
      for (let i = 0; i < 15; i++) {
        const itemDb = await db.query('SELECT completed FROM daily_log_item WHERE id = $1', [itemId]);
        activityCompleted = itemDb.rows[0].completed === true;
        if (activityCompleted) break;
        await new Promise((r) => setTimeout(r, 400));
      }

      results.push({
        viewport: vp.name,
        touchOk,
        a11yOk,
        afterRefresh,
        apiMatch,
        activityCompleted,
      });
      await page.close();
    }
    await browser.close();

    const failed = results.filter(
      (r) => !r.touchOk || !r.a11yOk || !r.afterRefresh.step0 || !r.afterRefresh.step1
        || !r.afterRefresh.step2 || !r.apiMatch || !r.activityCompleted
    );
    console.log(JSON.stringify({ step: 'r0-02-mobile', stepIds, results }, null, 2));
    if (failed.length) {
      console.error('[r0-02-mobile] FAIL', failed);
      process.exit(1);
    }
    console.log('[r0-02-mobile] PASS');
  } finally {
    await http.close();
    await db.cleanup();
  }
}

main().catch((err) => {
  console.error('[r0-02-mobile]', err.message);
  process.exit(1);
});
