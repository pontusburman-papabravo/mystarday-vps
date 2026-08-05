'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { hashPassword } = require('../src/lib/hash');
const { getLocalDateStr } = require('../src/lib/daily-log-generator');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

test('child daily-log exposes activity_timer_v2 when master switch is on (non-founder family)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  const dateStr = getLocalDateStr(new Date(), 'Europe/Stockholm');

  try {
    const session = await registerAndLogin(http.baseUrl);
    const childId = await createChild(http.baseUrl, session);
    const pin = '4821';
    await db.query(
      `UPDATE child SET username = 'timertest', pin = $1, activity_timers_enabled = true WHERE id = $2`,
      [await hashPassword(pin), childId]
    );

    const fam = await db.query('SELECT family_id FROM child WHERE id = $1', [childId]);
    const familyId = fam.rows[0].family_id;

    const tplTimed = await db.query(
      `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, duration_seconds, source)
       VALUES ($1, 'Timer QA 2min', '⏱️', 1, 0, 120, 'user') RETURNING id`,
      [familyId]
    );
    const tplPlain = await db.query(
      `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, duration_seconds, source)
       VALUES ($1, 'No timer act', '⭐', 1, 1, NULL, 'user') RETURNING id`,
      [familyId]
    );

    await db.query('DELETE FROM daily_log WHERE child_id = $1 AND date = $2', [childId, dateStr]);
    const logRes = await db.query(
      'INSERT INTO daily_log (child_id, date) VALUES ($1, $2) RETURNING id',
      [childId, dateStr]
    );
    const logId = logRes.rows[0].id;
    await db.query(
      `INSERT INTO daily_log_item
         (daily_log_id, activity_template_id, name, icon, star_value, sort_order, section)
       VALUES ($1, $2, 'Timer QA 2min', '⏱️', 1, 0, 'morgon'),
              ($1, $3, 'No timer act', '⭐', 1, 1, 'morgon')`,
      [logId, tplTimed.rows[0].id, tplPlain.rows[0].id]
    );

    const loginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'timertest', pin }),
    });
    assert.equal(loginRes.status, 200);
    let cookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      cookies = mergeCookies(cookies, [header]);
    }

    const logResHttp = await fetch(`${http.baseUrl}/api/me/daily-log?date=${dateStr}`, {
      headers: { Cookie: cookieHeader(cookies) },
    });
    const body = await logResHttp.json();
    assert.equal(logResHttp.status, 200);
    assert.equal(body.activity_timers_enabled, true);
    assert.equal(body.activity_timer_v2, true, 'v2 must follow master switch, not founder allowlist');

    const timed = body.items.find((i) => i.name === 'Timer QA 2min');
    const plain = body.items.find((i) => i.name === 'No timer act');
    assert.equal(timed.duration_seconds, 120);
    assert.equal(plain.duration_seconds, null);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
