#!/usr/bin/env node
/**
 * R0-04 — child Idag online → offline complete → online sync (mobile viewports).
 *
 * Usage:
 *   NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false node scripts/r0-04-child-offline-smoke.mjs
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

const ONLINE_NET = {
  offline: false,
  downloadThroughput: -1,
  uploadThroughput: -1,
  latency: 0,
};

const OFFLINE_NET = {
  offline: true,
  downloadThroughput: 0,
  uploadThroughput: 0,
  latency: 0,
};

async function hydrateChildPage(page, baseUrl, meUser, cookies) {
  const userJson = JSON.stringify(meUser);
  await page.evaluateOnNewDocument((u) => {
    try {
      localStorage.setItem('stjarndag_user', u);
      localStorage.setItem('stjarndag_device_mode', 'child');
      localStorage.setItem('substepIntroSeen', '1');
    } catch (_) { /* ignore */ }
  }, userJson);
  await page.setCookie(
    ...Object.entries(cookies).map(([name, value]) => ({
      name,
      value: String(value),
      url: baseUrl,
    }))
  );
}

async function waitForQueueFlush(page, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const pending = await page.evaluate(async () => {
      if (!window.OfflineQueue || typeof window.OfflineQueue.getPending !== 'function') return -1;
      const list = await window.OfflineQueue.getPending();
      return list.length;
    });
    if (pending === 0) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function runViewportFlow(puppeteer, baseUrl, db, ctx, viewport) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  const client = await page.createCDPSession();
  await client.send('Network.emulateNetworkConditions', ONLINE_NET);

  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });

  const consoleErrors = [];
  const completeRequests = [];
  page.on('pageerror', (err) => consoleErrors.push(String(err.message || err)));
  page.on('request', (req) => {
    const u = req.url();
    if (req.method() === 'PUT' && u.includes(`/api/me/daily-log-items/${ctx.itemId}/complete`)) {
      completeRequests.push({ when: Date.now(), url: u.replace(baseUrl, '') });
    }
  });

  await hydrateChildPage(page, baseUrl, ctx.meUser, ctx.cookies);
  await page.goto(`${baseUrl}/child/today`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector(`[data-item-id="${ctx.itemId}"]`, { timeout: 30000 });

  const beforeOffline = await page.evaluate(async (itemId, childId, dateStr) => {
    const card = document.getElementById('card-' + itemId);
    const activityCount = document.querySelectorAll('[data-item-id]').length;
    const cached = window.OfflineStore && childId
      ? await window.OfflineStore.getDailyLog(childId, dateStr)
      : null;
    return {
      activityCount,
      cardDone: card ? card.classList.contains('done') : null,
      cachedItemCompleted: cached && cached.items
        ? !!cached.items.find((i) => String(i.id) === String(itemId))?.completed
        : null,
    };
  }, ctx.itemId, ctx.childId, ctx.dateStr);

  await client.send('Network.emulateNetworkConditions', OFFLINE_NET);
  await page.waitForFunction(() => navigator.onLine === false, { timeout: 5000 }).catch(() => null);

  const offlineVisible = await page.evaluate((itemId) => {
    const activityCount = document.querySelectorAll('[data-item-id]').length;
    const card = document.getElementById('card-' + itemId);
    const emptyOffline = /Ingen anslutning|ingen anslutning|noConnection/i.test(
      document.getElementById('scheduleView')?.textContent || ''
    );
    return {
      activityCount,
      cardDone: card ? card.classList.contains('done') : null,
      emptyOffline,
    };
  }, ctx.itemId);

  await page.evaluate((itemId) => {
    if (typeof window.toggleItem === 'function') {
      window.toggleItem(itemId, false);
    }
  }, ctx.itemId);
  await page.waitForFunction(
    async (itemId) => {
      if (!window.OfflineQueue || !window.OfflineQueue.getPending) return false;
      const pending = await window.OfflineQueue.getPending();
      const queued = pending.some((e) => e.type === 'COMPLETE_ACTIVITY'
        && String(e.payload.itemId) === String(itemId));
      const card = document.getElementById('card-' + itemId);
      const done = card && card.classList.contains('done');
      return queued || done;
    },
    { timeout: 20000 },
    ctx.itemId
  ).catch(() => null);

  const afterOfflineTap = await page.evaluate(async (itemId) => {
    const card = document.getElementById('card-' + itemId);
    let pending = [];
    if (window.OfflineQueue && window.OfflineQueue.getPending) {
      pending = await window.OfflineQueue.getPending();
    }
    const completeEntries = pending.filter((e) => e.type === 'COMPLETE_ACTIVITY'
      && String(e.payload.itemId) === String(itemId));
    return {
      cardDone: card ? card.classList.contains('done') : null,
      pendingComplete: completeEntries.length,
      pendingTypes: pending.map((e) => e.type),
      onLine: navigator.onLine,
    };
  }, ctx.itemId);

  const dbBeforeOnline = await db.query(
    'SELECT completed FROM daily_log_item WHERE id = $1',
    [ctx.itemId]
  );
  const completedBeforeSync = dbBeforeOnline.rows[0]?.completed === true;

  await client.send('Network.emulateNetworkConditions', ONLINE_NET);
  await page.waitForFunction(() => navigator.onLine === true, { timeout: 5000 }).catch(() => null);
  await page.evaluate(() => {
    if (window.OfflineQueue && typeof window.OfflineQueue.flush === 'function') {
      return window.OfflineQueue.flush();
    }
    return null;
  });
  const flushed = await waitForQueueFlush(page, 25000);

  const dbAfterSync = await db.query(
    'SELECT completed, completed_by FROM daily_log_item WHERE id = $1',
    [ctx.itemId]
  );
  const completedAfterSync = dbAfterSync.rows[0]?.completed === true;

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector(`[data-item-id="${ctx.itemId}"]`, { timeout: 20000 });
  const afterRefresh = await page.evaluate((itemId) => {
    const card = document.getElementById('card-' + itemId);
    return { cardDone: card ? card.classList.contains('done') : null };
  }, ctx.itemId);

  const queueAfterRefresh = await page.evaluate(async () => {
    if (!window.OfflineQueue) return -1;
    const list = await window.OfflineQueue.getPending();
    return list.length;
  });

  await page.evaluate(() => {
    if (window.Auth && typeof window.Auth.logout === 'function') {
      window.Auth.logout();
    }
  });
  await new Promise((r) => setTimeout(r, 800));
  const queueAfterLogout = await page.evaluate(async () => {
    if (!window.OfflineQueue) return -1;
    const list = await window.OfflineQueue.getPending();
    return list.length;
  });

  await browser.close();

  const putCompleteCount = completeRequests.length;
  const pass = beforeOffline.activityCount > 0
    && offlineVisible.activityCount > 0
    && !offlineVisible.emptyOffline
    && afterOfflineTap.pendingComplete >= 1
    && !completedBeforeSync
    && completedAfterSync
    && putCompleteCount >= 1
    && putCompleteCount <= 2
    && afterRefresh.cardDone === true
    && queueAfterRefresh === 0
    && (queueAfterLogout === 0 || queueAfterLogout === -1)
    && flushed;

  return {
    viewport: viewport.name,
    pass,
    beforeOffline,
    offlineVisible,
    afterOfflineTap,
    completedBeforeSync,
    completedAfterSync,
    putCompleteCount,
    afterRefresh,
    queueAfterRefresh,
    queueAfterLogout,
    flushed,
    consoleErrors,
  };
}

async function main() {
  const puppeteer = await import('puppeteer').then((m) => m.default).catch(() => null);
  if (!puppeteer) {
    console.error('[r0-04-offline] puppeteer missing');
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
    console.error('[r0-04-offline] DATABASE_URL required');
    process.exit(2);
  }

  const http = await listenApp(createApp);
  const baseUrl = http.baseUrl;
  const dateStr = getLocalDateStr(new Date(), 'Europe/Stockholm');

  try {
    const session = await registerAndLogin(baseUrl);
    const pin = '2580';
    const childId = await createChild(baseUrl, session, {
      name: `R0Off${Date.now().toString(36).slice(-4)}`,
      pin,
      birthday: '2018-03-01',
    });
    const childRow = await db.query('SELECT username, family_id FROM child WHERE id = $1', [childId]);
    const { username, family_id: familyId } = childRow.rows[0];

    const tpl = await db.query(
      `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, source)
       VALUES ($1, 'R0OffAkt', '⭐', 1, 0, 'user') RETURNING id`,
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
       VALUES ($1, $2, 'R0OffAkt', '⭐', 1, 0, 'morgon') RETURNING id`,
      [logRes.rows[0].id, tpl.rows[0].id]
    );
    const itemId = itemRes.rows[0].id;

    const cl = await childLoginRaw(baseUrl, { username, pin });
    if (cl.status !== 200) throw new Error(`child login ${cl.status}`);
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(cl.cookies) },
    });
    if (!meRes.ok) throw new Error(`me ${meRes.status}`);
    const meUser = await meRes.json();

    const ctx = { itemId, childId, meUser, cookies: cl.cookies, dateStr };

    const runs = [];
    for (const vp of VIEWPORTS) {
      await db.query(
        'UPDATE daily_log_item SET completed = false, completed_at = NULL, completed_by = NULL WHERE id = $1',
        [itemId]
      );
      runs.push(await runViewportFlow(puppeteer, baseUrl, db, ctx, vp));
    }

    console.log(JSON.stringify({ step: 'r0-04-offline-mobile', runs }, null, 2));

    const failed = runs.filter((r) => !r.pass);
    if (failed.length) {
      console.error('[r0-04-offline] FAIL', failed);
      process.exit(1);
    }
    console.log('[r0-04-offline] PASS');
  } finally {
    await http.close();
    await db.cleanup();
  }
}

main().catch((err) => {
  console.error('[r0-04-offline]', err.message);
  process.exit(1);
});
