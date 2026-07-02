'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { hashPassword } = require('../src/lib/hash');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

test('child weekly-schedule: child token can read, cannot write parent schedule API', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const childId = await createChild(http.baseUrl, session, { name: 'Vecka', emoji: '📅' });

    const childRow = await db.query('SELECT view_type, username FROM child WHERE id = $1', [childId]);
    assert.equal(childRow.rows[0].view_type, 'now_next_later');

    const pinHash = await hashPassword('4321');
    await db.query('UPDATE child SET pin = $1, username = $2 WHERE id = $3', [pinHash, 'vecka', childId]);

    const ws = await db.query(
      `INSERT INTO weekly_schedule (child_id, day_of_week, sort_order)
       VALUES ($1, 1, 1) RETURNING id`,
      [childId]
    );
    const tpl = await db.query(
      `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, source)
       SELECT family_id, 'Frukost', '🥣', 1, 0, 'user' FROM child WHERE id = $1 RETURNING id`,
      [childId]
    );
    await db.query(
      `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section)
       VALUES ($1, $2, 0, 'morgon')`,
      [ws.rows[0].id, tpl.rows[0].id]
    );

    const loginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'vecka', pin: '4321' }),
    });
    assert.equal(loginRes.status, 200);
    let cookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      cookies = mergeCookies(cookies, [header]);
    }

    const readRes = await fetch(`${http.baseUrl}/api/me/weekly-schedule`, {
      headers: { Cookie: cookieHeader(cookies) },
    });
    const readBody = JSON.parse(await readRes.text());
    assert.equal(readRes.status, 200);
    assert.ok(Array.isArray(readBody.days));
    assert.equal(readBody.days.length, 7);
    const monday = readBody.days.find((d) => d.dayOfWeek === 1);
    assert.ok(monday);
    assert.equal(monday.activities.length, 1);
    assert.equal(monday.activities[0].name, 'Frukost');

    const writeRes = await fetch(`${http.baseUrl}/api/children/${childId}/schedules`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader(cookies),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ day_of_week: 2, activities: [] }),
    });
    assert.ok(writeRes.status === 401 || writeRes.status === 403, `expected 401/403, got ${writeRes.status}`);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
