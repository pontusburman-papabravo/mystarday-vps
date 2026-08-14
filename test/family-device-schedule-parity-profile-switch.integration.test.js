'use strict';

/**
 * Schedule parity after trusted-device profile switch (child A → child B).
 * Parent sort_order must match child /api/me/daily-log order for each child context.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { getDailyLog } = require('./helpers/golden-path-fas6.js');
const { FLAG_KEY: TRUSTED_FLAG } = require('../src/lib/trusted-device-flags');
const { FLAG_KEY: ENTRY_FLAG } = require('../src/lib/family-device-entry-flags');
const { FLAG_KEY: DAILY_UX_FLAG } = require('../src/lib/family-device-daily-ux-flags');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const DATE = '2026-08-12';

async function enableFlags(db) {
  for (const key of [TRUSTED_FLAG, ENTRY_FLAG, DAILY_UX_FLAG]) {
    await db.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, true, 'test')
       ON CONFLICT (key) DO UPDATE SET enabled = true`,
      [key]
    );
  }
}

async function insertDailyLogItems(db, childId, names) {
  await db.query(
    'DELETE FROM daily_log_item WHERE daily_log_id IN (SELECT id FROM daily_log WHERE child_id = $1 AND date = $2)',
    [childId, DATE]
  );
  await db.query('DELETE FROM daily_log WHERE child_id = $1 AND date = $2', [childId, DATE]);
  const logRes = await db.query(
    `INSERT INTO daily_log (child_id, date) VALUES ($1, $2) RETURNING id`,
    [childId, DATE]
  );
  const logId = logRes.rows[0].id;
  for (let i = 0; i < names.length; i += 1) {
    await db.query(
      `INSERT INTO daily_log_item
         (daily_log_id, name, icon, star_value, sort_order, section)
       VALUES ($1, $2, '⭐', 1, $3, 'morgon')`,
      [logId, names[i], i]
    );
  }
  return logId;
}

function morgonNames(body) {
  const sec = body.sections?.morgon || body.items.filter((i) => i.section === 'morgon');
  return sec.map((i) => i.name);
}

async function parentMorgonNames(baseUrl, parentSession, childId) {
  const res = await fetch(
    `${baseUrl}/api/children/${childId}/daily-log?date=${encodeURIComponent(DATE)}`,
    {
      headers: {
        Cookie: cookieHeader(parentSession.cookies),
        'X-CSRF-Token': parentSession.csrfToken,
      },
    }
  );
  const text = await res.text();
  assert.equal(res.status, 200, text);
  const body = JSON.parse(text);
  return morgonNames(body);
}

async function enrollShared(http, session) {
  const enrollRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/shared`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
    body: JSON.stringify({ platform: 'web', label: 'parity shared' }),
  });
  assert.equal(enrollRes.status, 201, await enrollRes.text());
  let cookies = { ...session.cookies };
  for (const header of getSetCookieHeaders(enrollRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return cookies;
}

function trustedOnly(cookies) {
  return cookies.trusted_device ? { trusted_device: cookies.trusted_device } : cookies;
}

async function selectChild(baseUrl, deviceCookies, childId) {
  const res = await fetch(`${baseUrl}/api/auth/trusted-device/select-child`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(trustedOnly(deviceCookies)),
    },
    body: JSON.stringify({ child_id: childId }),
  });
  const text = await res.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  assert.equal(res.status, 200, text);
  assert.equal(body.ok, true, text);
  assert.equal(body.user?.id, childId, text);
  let cookies = { ...deviceCookies };
  for (const header of getSetCookieHeaders(res)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return { cookies, csrf: body.csrfToken };
}

test('schedule parity: child A → child B profile switch preserves parent order per child', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await enableFlags(db);
    const parent = await registerAndLogin(http.baseUrl);
    const childA = await createChild(http.baseUrl, parent, { name: 'Alma', emoji: '🦊' });
    const childB = await createChild(http.baseUrl, parent, { name: 'Bo', emoji: '🐻' });

    const orderA = ['Alma borstar', 'Alma kläder', 'Alma frukost'];
    const orderB = ['Bo tvätt', 'Bo frukost', 'Bo skor'];
    await insertDailyLogItems(db, childA, orderA);
    await insertDailyLogItems(db, childB, orderB);

    const parentOrderA = await parentMorgonNames(http.baseUrl, parent, childA);
    const parentOrderB = await parentMorgonNames(http.baseUrl, parent, childB);
    assert.deepEqual(parentOrderA, orderA);
    assert.deepEqual(parentOrderB, orderB);

    const deviceCookies = await enrollShared(http, parent);

    const ctxA = await selectChild(http.baseUrl, deviceCookies, childA);
    const logA = await getDailyLog(http.baseUrl, ctxA.cookies, ctxA.csrf, DATE);
    assert.equal(logA.status, 200, logA.text);
    assert.deepEqual(morgonNames(logA.body), orderA);
    assert.equal(logA.body.child_id || logA.body.childId, undefined);
    assert.ok(logA.body.items || logA.body.sections);

    const ctxB = await selectChild(http.baseUrl, deviceCookies, childB);
    const logB = await getDailyLog(http.baseUrl, ctxB.cookies, ctxB.csrf, DATE);
    assert.equal(logB.status, 200, logB.text);
    assert.deepEqual(morgonNames(logB.body), orderB);
    assert.notDeepEqual(morgonNames(logB.body), orderA);

    await t.test('warm refresh after switch still matches parent order', async () => {
      const refreshB = await getDailyLog(http.baseUrl, ctxB.cookies, ctxB.csrf, DATE);
      assert.equal(refreshB.status, 200);
      assert.deepEqual(morgonNames(refreshB.body), parentOrderB);
    });
  } finally {
    await http.close();
    await db.cleanup();
  }
});
