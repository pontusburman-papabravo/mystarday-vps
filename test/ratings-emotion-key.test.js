'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { hashPassword } = require('../src/lib/hash');
const { seedBildstodPr3Features } = require('./helpers/bildstod-pr3-features.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function childLogin(http, username, pin) {
  const loginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, pin }),
  });
  const loginBody = JSON.parse(await loginRes.text());
  assert.equal(loginRes.status, 200);
  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return { cookies, csrfToken: loginBody.csrfToken };
}

test('POST /api/me/daily-log-items/:id/rate accepts emotion_key', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await seedBildstodPr3Features(db);
    const session = await registerAndLogin(http.baseUrl);
    const childId = await createChild(http.baseUrl, session, { name: 'Känsla' });
    await db.query(
      `UPDATE child SET username = 'kansla', pin = $1, mood_input_mode = 'cards' WHERE id = $2`,
      [await hashPassword('1234'), childId]
    );

    const log = await db.query(
      `INSERT INTO daily_log (child_id, date) VALUES ($1, CURRENT_DATE) RETURNING id`,
      [childId]
    );
    const item = await db.query(
      `INSERT INTO daily_log_item (daily_log_id, name, section, sort_order, star_value, completed)
       VALUES ($1, 'Frukost', 'morgon', 0, 1, true) RETURNING id`,
      [log.rows[0].id]
    );

    const { cookies, csrfToken } = await childLogin(http, 'kansla', '1234');
    const res = await fetch(`${http.baseUrl}/api/me/daily-log-items/${item.rows[0].id}/rate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(cookies),
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ emotion_key: 'happy' }),
    });
    const body = JSON.parse(await res.text());
    assert.equal(res.status, 200, body.error || res.statusText);
    assert.equal(body.rating.emotion_key, 'happy');
    assert.equal(body.rating.score, null);

    const row = await db.query(
      `SELECT emotion_key, score FROM rating WHERE daily_log_item_id = $1 AND user_type = 'child'`,
      [item.rows[0].id]
    );
    assert.equal(row.rows[0].emotion_key, 'happy');
    assert.equal(row.rows[0].score, null);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('POST rate rejects invalid emotion_key and score-only still works', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await seedBildstodPr3Features(db);
    const session = await registerAndLogin(http.baseUrl);
    const childId = await createChild(http.baseUrl, session, { name: 'Betyg' });
    await db.query(
      `UPDATE child SET username = 'betyg', pin = $1 WHERE id = $2`,
      [await hashPassword('1234'), childId]
    );

    const log = await db.query(
      `INSERT INTO daily_log (child_id, date) VALUES ($1, CURRENT_DATE) RETURNING id`,
      [childId]
    );
    const item = await db.query(
      `INSERT INTO daily_log_item (daily_log_id, name, section, sort_order, star_value, completed)
       VALUES ($1, 'Tänder', 'morgon', 0, 1, true) RETURNING id`,
      [log.rows[0].id]
    );

    const { cookies, csrfToken } = await childLogin(http, 'betyg', '1234');

    const bad = await fetch(`${http.baseUrl}/api/me/daily-log-items/${item.rows[0].id}/rate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(cookies),
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ emotion_key: 'not_a_real_key' }),
    });
    assert.equal(bad.status, 400);

    const ok = await fetch(`${http.baseUrl}/api/me/daily-log-items/${item.rows[0].id}/rate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(cookies),
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ score: 8 }),
    });
    assert.equal(ok.status, 200);
    const okBody = await ok.json();
    assert.equal(okBody.rating.score, 8);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
