#!/usr/bin/env node
/**
 * R0-01 mobile smoke: parent weekly-schedule reorder → child Idag DOM order.
 * Viewports: 390×844 (iPhone-like), 412×915 (Android-like), touch enabled.
 *
 * Usage:
 *   NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false node scripts/r0-01-mobile-order-smoke.mjs
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

async function main() {
  const puppeteer = await import('puppeteer').then((m) => m.default).catch(() => null);
  if (!puppeteer) {
    console.error('[r0-01-mobile] puppeteer missing — npm install --include=dev');
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
  const { childLoginRaw, getDailyLog } = require(path.join(ROOT, 'test/helpers/golden-path-fas6.js'));
  const {
    getLocalDateStr,
    getDayOfWeek,
    getOrGenerateDailyLog,
  } = require(path.join(ROOT, 'src/lib/daily-log-generator'));

  const db = await setupTestDb();
  if (db.skip) {
    console.error('[r0-01-mobile] DATABASE_URL required on localhost');
    process.exit(2);
  }

  const http = await listenApp(createApp);
  const baseUrl = http.baseUrl;
  const tz = 'Europe/Stockholm';
  const dateStr = getLocalDateStr(new Date(), tz);
  const dow = getDayOfWeek(dateStr, tz);
  const names = ['R0MobA', 'R0MobB', 'R0MobC'];
  const expectedAfter = ['R0MobC', 'R0MobA', 'R0MobB'];

  try {
    const session = await registerAndLogin(baseUrl);
    const pin = String(3000 + Math.floor(Math.random() * 5000)).replace(/1234/, '2580');
    const childId = await createChild(baseUrl, session, {
      name: `R0Mob${Date.now().toString(36)}`,
      pin,
      birthday: '2018-06-01',
    });
    const childRow = await db.query('SELECT username, family_id FROM child WHERE id = $1', [childId]);
    const { username, family_id: familyId } = childRow.rows[0];

    const templates = [];
    for (const label of names) {
      const ins = await db.query(
        `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order)
         VALUES ($1, $2, '⭐', 1, 0) RETURNING id`,
        [familyId, label]
      );
      templates.push(ins.rows[0].id);
    }

    const wsIns = await db.query(
      `INSERT INTO weekly_schedule (family_id, name, day_of_week, child_id)
       VALUES ($1, 'R0 mobile', $2, $3) RETURNING id`,
      [familyId, dow, childId]
    );
    const scheduleId = wsIns.rows[0].id;
    const wsiIds = [];
    for (let i = 0; i < templates.length; i++) {
      const w = await db.query(
        `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section)
         VALUES ($1, $2, $3, 'morgon') RETURNING id`,
        [scheduleId, templates[i], i]
      );
      wsiIds.push(w.rows[0].id);
    }

    await getOrGenerateDailyLog(childId, dateStr);

    const reorderRes = await fetch(`${baseUrl}/api/schedules/${scheduleId}/items/reorder`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(session.cookies),
        'X-CSRF-Token': session.csrfToken,
      },
      body: JSON.stringify({
        order: [
          { id: wsiIds[2], sort_order: 0 },
          { id: wsiIds[0], sort_order: 1 },
          { id: wsiIds[1], sort_order: 2 },
        ],
      }),
    });
    if (reorderRes.status !== 200) {
      throw new Error(`reorder ${reorderRes.status}: ${await reorderRes.text()}`);
    }

    const cl = await childLoginRaw(baseUrl, { username, pin });
    if (cl.status !== 200) throw new Error(`child login ${cl.status}`);
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(cl.cookies) },
    });
    if (!meRes.ok) throw new Error(`auth/me ${meRes.status}: ${await meRes.text()}`);
    const meUser = await meRes.json();

    const daily = await getDailyLog(baseUrl, cl.cookies, cl.csrfToken, dateStr);
    const apiNames = (daily.body?.sections?.morgon || []).map((i) => i.name);
    const apiIds = (daily.body?.sections?.morgon || []).map((i) => i.id);
    if (JSON.stringify(apiNames) !== JSON.stringify(expectedAfter)) {
      throw new Error(`API order mismatch: ${JSON.stringify(apiNames)}`);
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const results = [];
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({
        width: vp.width,
        height: vp.height,
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      });
      const userJson = JSON.stringify(meUser);
      const csrf = cl.csrfToken || '';
      await page.evaluateOnNewDocument((u, c) => {
        try {
          localStorage.setItem('stjarndag_user', u);
          localStorage.setItem('stjarndag_device_mode', 'child');
          if (c) localStorage.setItem('stjarndag_csrf', c);
        } catch (_) { /* ignore */ }
      }, userJson, csrf);
      await page.setCookie(
        ...Object.entries(cl.cookies).map(([name, value]) => ({
          name,
          value: String(value),
          url: baseUrl,
        }))
      );
      await page.goto(`${baseUrl}/child/today`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForSelector('[data-item-id]', { timeout: 25000 });

      const dom = await page.evaluate((expectedAfterNames) => {
        const cards = Array.from(document.querySelectorAll('[data-item-id]'));
        return cards
          .map((c) => ({
            id: c.getAttribute('data-item-id'),
            name: (c.querySelector(
              '.activity-name, .photo-activity-card__title, h3, .font-bold, .font-heading'
            )?.textContent || '').trim(),
          }))
          .filter((x) => expectedAfterNames.includes(x.name));
      }, expectedAfter);

      const domIds = dom.map((d) => d.id);
      const domNames = dom.map((d) => d.name);
      const idMatch = domIds.length === apiIds.length && domIds.every((id, i) => id === apiIds[i]);
      const nameMatch = JSON.stringify(domNames) === JSON.stringify(expectedAfter);
      results.push({ viewport: vp.name, idMatch, nameMatch, domCount: dom.length });
      await page.close();
    }
    await browser.close();

    const failed = results.filter((r) => !r.idMatch || !r.nameMatch);
    console.log(JSON.stringify({ step: 'r0-01-mobile', apiNames, apiIds, results }, null, 2));
    if (failed.length) {
      console.error('[r0-01-mobile] FAIL', failed);
      process.exit(1);
    }
    console.log('[r0-01-mobile] PASS');
  } finally {
    await http.close();
    await db.cleanup();
  }
}

main().catch((err) => {
  console.error('[r0-01-mobile]', err.message);
  process.exit(1);
});
