'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { seedBildstodPr3Features } = require('./helpers/bildstod-pr3-features.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function familyIdForSession(db, email) {
  const { rows } = await db.query(
    'SELECT family_id FROM parent WHERE LOWER(email) = $1',
    [email.toLowerCase()]
  );
  return rows[0].family_id;
}

test('GET mood-summary: cross-family child returns 403', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await seedBildstodPr3Features(db);
    const familyA = await registerAndLogin(http.baseUrl, { name: 'Mood A' });
    const familyB = await registerAndLogin(http.baseUrl, { name: 'Mood B' });
    const childB = await createChild(http.baseUrl, familyB, { name: 'Barn B' });

    const res = await fetch(
      `${http.baseUrl}/api/children/${childB}/mood-summary?date=2026-07-02`,
      { headers: { Cookie: cookieHeader(familyA.cookies) } }
    );
    assert.equal(res.status, 403);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('GET mood-summary: same-family parent receives aggregates', async (t) => {
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
    const childId = await createChild(http.baseUrl, session, { name: 'Mood Child' });

    const log = await db.query(
      `INSERT INTO daily_log (child_id, date) VALUES ($1, '2026-07-02') RETURNING id`,
      [childId]
    );
    const items = await db.query(
      `INSERT INTO daily_log_item (daily_log_id, name, section, sort_order, star_value, completed)
       VALUES ($1, 'A', 'morgon', 0, 1, true),
              ($1, 'B', 'morgon', 1, 1, true)
       RETURNING id`,
      [log.rows[0].id]
    );
    await db.query(
      `INSERT INTO rating (daily_log_item_id, user_type, emotion_key, score)
       VALUES ($1, 'child', 'happy', NULL),
              ($2, 'child', NULL, 7)`,
      [items.rows[0].id, items.rows[1].id]
    );

    const res = await fetch(
      `${http.baseUrl}/api/children/${childId}/mood-summary?date=2026-07-02`,
      { headers: { Cookie: cookieHeader(session.cookies) } }
    );
    const body = await res.json();
    assert.equal(res.status, 200, body.error);
    assert.equal(body.date, '2026-07-02');
    const happy = body.emotions.find((e) => e.key === 'happy');
    assert.ok(happy);
    assert.equal(happy.count, 1);
    assert.equal(happy.emoji, '😊');
    assert.ok(body.scores.count >= 1);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
