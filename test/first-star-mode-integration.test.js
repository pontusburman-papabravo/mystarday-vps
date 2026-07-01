'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { hashPassword } = require('../src/lib/hash');
const { FLAG_KEYS } = require('../src/lib/activation-flags');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function countChildAnalyticsEvents(db, familyId, childId, eventType) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS n FROM analytics_events
     WHERE family_id = $1 AND event_type = $2 AND metadata->>'child_id' = $3`,
    [familyId, eventType, childId]
  );
  return result.rows[0]?.n ?? 0;
}

test('flag OFF — daily-log response unchanged (no first_star_mode field)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await db.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, false, 'test')
       ON CONFLICT (key) DO UPDATE SET enabled = false`,
      [FLAG_KEYS.firstStarMode]
    );

    const session = await registerAndLogin(http.baseUrl);
    const parentRow = await db.query('SELECT family_id FROM parent WHERE email = $1', [session.email]);
    const familyId = parentRow.rows[0].family_id;
    const childId = await createChild(http.baseUrl, session, { name: 'Nova', emoji: '⭐' });
    const pinHash = await hashPassword('1234');
    await db.query(
      `UPDATE child SET username = 'nova', pin = $1, view_type = 'day_sections' WHERE id = $2`,
      [pinHash, childId]
    );

    const log = await db.query(
      `INSERT INTO daily_log (child_id, date) VALUES ($1, CURRENT_DATE) RETURNING id`,
      [childId]
    );
    await db.query(
      `INSERT INTO daily_log_item (daily_log_id, name, section, sort_order, star_value, completed)
       VALUES ($1, 'Vakna', 'morgon', 0, 1, false),
              ($1, 'Frukost', 'morgon', 1, 1, false)`,
      [log.rows[0].id]
    );

    const loginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'nova', pin: '1234' }),
    });
    assert.equal(loginRes.status, 200);
    let cookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      cookies = mergeCookies(cookies, [header]);
    }

    const res = await fetch(`${http.baseUrl}/api/me/daily-log`, {
      headers: { Cookie: cookieHeader(cookies) },
    });
    const body = JSON.parse(await res.text());
    assert.equal(res.status, 200);
    assert.equal(body.items.length, 2);
    assert.equal('first_star_mode' in body, false);
    assert.equal(body.now_next_filtered, false);
    assert.equal(await countChildAnalyticsEvents(db, familyId, childId, 'child_login'), 0);
    assert.equal(await countChildAnalyticsEvents(db, familyId, childId, 'first_star_mode_shown'), 0);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('flag ON + 0 completions — first_star_mode=true and single NU item', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await db.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, true, 'test')
       ON CONFLICT (key) DO UPDATE SET enabled = true`,
      [FLAG_KEYS.firstStarMode]
    );

    const session = await registerAndLogin(http.baseUrl);
    const childId = await createChild(http.baseUrl, session, { name: 'Ella', emoji: '🌸' });
    const pinHash = await hashPassword('4321');
    await db.query(
      `UPDATE child SET username = 'ella', pin = $1, view_type = 'now_next_later', show_now_next = true WHERE id = $2`,
      [pinHash, childId]
    );

    const log = await db.query(
      `INSERT INTO daily_log (child_id, date) VALUES ($1, CURRENT_DATE) RETURNING id`,
      [childId]
    );
    await db.query(
      `INSERT INTO daily_log_item (daily_log_id, name, section, sort_order, star_value, completed)
       VALUES ($1, 'Vakna', 'morgon', 0, 1, false),
              ($1, 'Frukost', 'morgon', 1, 1, false),
              ($1, 'Lunch', 'dag', 0, 1, false)`,
      [log.rows[0].id]
    );

    const loginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'ella', pin: '4321' }),
    });
    assert.equal(loginRes.status, 200);
    let cookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      cookies = mergeCookies(cookies, [header]);
    }

    const res = await fetch(`${http.baseUrl}/api/me/daily-log`, {
      headers: { Cookie: cookieHeader(cookies) },
    });
    const body = JSON.parse(await res.text());
    assert.equal(res.status, 200);
    assert.equal(body.first_star_mode, true);
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].name, 'Vakna');
    assert.equal(body.items[0]._nnl_status, 'now');
    assert.equal(body.now_next_filtered, true);
    assert.equal(body.total, 3);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('flag ON + lifetime completion — first_star_mode=false and full item list', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await db.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, true, 'test')
       ON CONFLICT (key) DO UPDATE SET enabled = true`,
      [FLAG_KEYS.firstStarMode]
    );

    const session = await registerAndLogin(http.baseUrl);
    const childId = await createChild(http.baseUrl, session, { name: 'Leo', emoji: '🦁' });
    const pinHash = await hashPassword('5678');
    await db.query(
      `UPDATE child SET username = 'leo', pin = $1 WHERE id = $2`,
      [pinHash, childId]
    );

    const log = await db.query(
      `INSERT INTO daily_log (child_id, date) VALUES ($1, CURRENT_DATE) RETURNING id`,
      [childId]
    );
    await db.query(
      `INSERT INTO daily_log_item (daily_log_id, name, section, sort_order, star_value, completed, completed_at, completed_by)
       VALUES ($1, 'Vakna', 'morgon', 0, 1, true, NOW(), 'child'),
              ($1, 'Frukost', 'morgon', 1, 1, false, NULL, NULL)`,
      [log.rows[0].id]
    );

    const loginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'leo', pin: '5678' }),
    });
    assert.equal(loginRes.status, 200);
    let cookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      cookies = mergeCookies(cookies, [header]);
    }

    const res = await fetch(`${http.baseUrl}/api/me/daily-log`, {
      headers: { Cookie: cookieHeader(cookies) },
    });
    const body = JSON.parse(await res.text());
    assert.equal(res.status, 200);
    assert.equal(body.first_star_mode, false);
    assert.equal(body.items.length, 2);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('flag ON — first-star analytics funnel events with dedup', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await db.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, true, 'test')
       ON CONFLICT (key) DO UPDATE SET enabled = true`,
      [FLAG_KEYS.firstStarMode]
    );

    const session = await registerAndLogin(http.baseUrl);
    const parentRow = await db.query('SELECT family_id FROM parent WHERE email = $1', [session.email]);
    const familyId = parentRow.rows[0].family_id;
    const childId = await createChild(http.baseUrl, session, { name: 'Maja', emoji: '⭐' });
    const pinHash = await hashPassword('9999');
    await db.query(
      `UPDATE child SET username = 'maja', pin = $1 WHERE id = $2`,
      [pinHash, childId]
    );

    const log = await db.query(
      `INSERT INTO daily_log (child_id, date) VALUES ($1, CURRENT_DATE) RETURNING id`,
      [childId]
    );
    const itemRes = await db.query(
      `INSERT INTO daily_log_item (daily_log_id, name, section, sort_order, star_value, completed)
       VALUES ($1, 'Tänder', 'morgon', 0, 1, false)
       RETURNING id`,
      [log.rows[0].id]
    );
    const itemId = itemRes.rows[0].id;

    const loginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'maja', pin: '9999' }),
    });
    const loginBody = JSON.parse(await loginRes.text());
    assert.equal(loginRes.status, 200);
    let cookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      cookies = mergeCookies(cookies, [header]);
    }

    assert.equal(await countChildAnalyticsEvents(db, familyId, childId, 'child_login'), 1);

    const dailyRes = await fetch(`${http.baseUrl}/api/me/daily-log`, {
      headers: { Cookie: cookieHeader(cookies) },
    });
    assert.equal(dailyRes.status, 200);
    assert.equal(await countChildAnalyticsEvents(db, familyId, childId, 'first_star_mode_shown'), 1);

    await fetch(`${http.baseUrl}/api/me/daily-log`, {
      headers: { Cookie: cookieHeader(cookies) },
    });
    assert.equal(await countChildAnalyticsEvents(db, familyId, childId, 'first_star_mode_shown'), 1);

    const completeRes = await fetch(`${http.baseUrl}/api/me/daily-log-items/${itemId}/complete`, {
      method: 'PUT',
      headers: {
        Cookie: cookieHeader(cookies),
        'Content-Type': 'application/json',
        'X-CSRF-Token': loginBody.csrfToken,
      },
    });
    assert.equal(completeRes.status, 200);

    assert.equal(await countChildAnalyticsEvents(db, familyId, childId, 'activity_completed'), 1);
    assert.equal(await countChildAnalyticsEvents(db, familyId, childId, 'first_completion'), 1);
    assert.equal(await countChildAnalyticsEvents(db, familyId, childId, 'first_star_mode_exited'), 1);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
