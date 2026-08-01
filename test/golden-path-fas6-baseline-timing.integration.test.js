'use strict';

/**
 * Fas 6 — read-only golden path timing baseline (local/CI with real Postgres).
 * Measures API steps: register → login → onboarding child → schedule → child-login → daily-log → complete.
 * Does not change product code; logs timings for docs/FAS-6-GOLDEN-PATH-MAPPING.md.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function seedMinimalDefaultSchedule(db, scheduleName, itemName = 'Vakna') {
  let defaultSched = await db.query('SELECT id FROM default_schedule WHERE name = $1', [scheduleName]);
  if (defaultSched.rows.length === 0) {
    const ins = await db.query(
      `INSERT INTO default_schedule (name, sort_order) VALUES ($1, 0) RETURNING id`,
      [scheduleName]
    );
    await db.query(
      `INSERT INTO default_schedule_item
         (default_schedule_id, name, icon, section, star_value, sort_order)
       VALUES ($1, $2, '🛏️', 'morgon', 1, 0)`,
      [ins.rows[0].id, itemName]
    );
    return ins.rows[0].id;
  }
  const items = await db.query(
    'SELECT id FROM default_schedule_item WHERE default_schedule_id = $1 LIMIT 1',
    [defaultSched.rows[0].id]
  );
  if (items.rows.length === 0) {
    await db.query(
      `INSERT INTO default_schedule_item
         (default_schedule_id, name, icon, section, star_value, sort_order)
       VALUES ($1, $2, '🛏️', 'morgon', 1, 0)`,
      [defaultSched.rows[0].id, itemName]
    );
  }
  return defaultSched.rows[0].id;
}

function msSince(start) {
  return Date.now() - start;
}

test('Fas 6 golden path — API timing baseline (read-only measurement)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  const apiCalls = [];
  const timings = {};
  let t0 = Date.now();
  const mark = (key) => {
    timings[key] = msSince(t0);
    t0 = Date.now();
  };

  try {
    await seedMinimalDefaultSchedule(db, 'Helg');
    const templateGroup = 'helg';

    const email = `golden-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const password = 'integration-test-pass-1';

    const registerRes = await fetch(`${http.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: 'Golden Parent' }),
    });
    apiCalls.push('POST /api/auth/register');
    assert.equal(registerRes.status, 201);
    mark('register_ms');

    const loginRes = await fetch(`${http.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    apiCalls.push('POST /api/auth/login');
    const loginBody = JSON.parse(await loginRes.text());
    assert.equal(loginRes.status, 200);
    let parentCookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      parentCookies = mergeCookies(parentCookies, [header]);
    }
    mark('login_ms');

    const parentHeaders = {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(parentCookies),
      'X-CSRF-Token': loginBody.csrfToken,
    };

    const childRes = await fetch(`${http.baseUrl}/api/onboarding/child`, {
      method: 'POST',
      headers: parentHeaders,
      body: JSON.stringify({ name: 'GoldenBarn', emoji: '🌟' }),
    });
    apiCalls.push('POST /api/onboarding/child');
    const childBody = await childRes.json();
    assert.equal(childRes.status, 201, JSON.stringify(childBody));
    const childId = childBody.id;
    const pin = childBody.pin;
    mark('onboarding_child_ms');

    const scheduleRes = await fetch(`${http.baseUrl}/api/onboarding/schedule`, {
      method: 'POST',
      headers: parentHeaders,
      body: JSON.stringify({ child_id: childId, template_group: templateGroup }),
    });
    apiCalls.push('POST /api/onboarding/schedule');
    const scheduleBody = await scheduleRes.json();
    assert.equal(scheduleRes.status, 200, JSON.stringify(scheduleBody));
    mark('onboarding_schedule_ms');

    const parentRow = await db.query('SELECT onboarding_completed FROM parent WHERE email = $1', [email]);
    assert.equal(parentRow.rows[0].onboarding_completed, true);

    const childLoginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: childBody.username, pin }),
    });
    apiCalls.push('POST /api/auth/child-login');
    const childLoginText = await childLoginRes.text();
    assert.equal(childLoginRes.status, 200, childLoginText);
    const childLoginBody = JSON.parse(childLoginText);
    let childCookies = {};
    for (const header of getSetCookieHeaders(childLoginRes)) {
      childCookies = mergeCookies(childCookies, [header]);
    }
    mark('child_login_ms');

    const childHeaders = {
      Cookie: cookieHeader(childCookies),
      'X-CSRF-Token': childLoginBody.csrfToken,
    };

    const dailyLogRes = await fetch(`${http.baseUrl}/api/me/daily-log`, {
      headers: childHeaders,
    });
    apiCalls.push('GET /api/me/daily-log');
    const dailyLog = await dailyLogRes.json();
    assert.equal(dailyLogRes.status, 200);
    mark('child_daily_log_ms');

    const items = dailyLog.items || dailyLog.daily_log_items || [];
    const pending = items.find((i) => !i.completed);
    assert.ok(pending, 'expected at least one schedulable item');

    const completeRes = await fetch(`${http.baseUrl}/api/me/daily-log-items/${pending.id}/complete`, {
      method: 'PUT',
      headers: childHeaders,
    });
    apiCalls.push('PUT /api/me/daily-log-items/:id/complete');
    const completeBody = await completeRes.json();
    assert.equal(completeRes.status, 200);
    mark('child_complete_ms');

    const dupCompleteRes = await fetch(`${http.baseUrl}/api/me/daily-log-items/${pending.id}/complete`, {
      method: 'PUT',
      headers: childHeaders,
    });
    apiCalls.push('PUT /api/me/daily-log-items/:id/complete (idempotent retry)');
    assert.equal(dupCompleteRes.status, 200);
    mark('child_complete_retry_ms');

    const activation = await db.query(
      `SELECT schema_saved_at, child_access_completed_at, first_completion_at
       FROM family_activation_state s
       JOIN parent p ON p.family_id = s.family_id
       WHERE p.email = $1`,
      [email]
    );
    assert.ok(activation.rows[0].schema_saved_at);
    assert.ok(activation.rows[0].child_access_completed_at);
    assert.ok(activation.rows[0].first_completion_at);

    const report = {
      origin_main_note: 'Run against local listenApp + Postgres (NODE_ENV=test)',
      timings_ms: timings,
      total_api_calls: apiCalls.length,
      api_sequence: apiCalls,
      first_star_meta: completeBody.meta_milestones || {},
      child_access_meta: childLoginBody.meta_milestones || {},
    };
    console.log('[FAS6_GOLDEN_PATH_TIMING]', JSON.stringify(report, null, 2));
  } finally {
    await http.close();
    await db.cleanup();
  }
});
