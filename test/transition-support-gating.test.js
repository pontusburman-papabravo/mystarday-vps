'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { hashPassword } = require('../src/lib/hash');
const { seedBildstodPr3Features } = require('./helpers/bildstod-pr3-features.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

test('hasAccess denies transition_support without teacch', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const { hasAccess } = require('../db/features');
  const familySubscriptions = require('../db/family-subscriptions');

  await seedBildstodPr3Features(db);
  const familyRes = await db.query(`INSERT INTO family (name) VALUES ('PR3 gate') RETURNING id`);
  const familyId = familyRes.rows[0].id;
  await familySubscriptions.createForNewFamily(familyId);
  assert.equal(await hasAccess(familyId, 'transition_support'), false);
  await db.query('DELETE FROM family WHERE id = $1', [familyId]);
  await db.cleanup();
});

test('GET /api/me/transition-support returns 403 without teacch', async (t) => {
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
    const childId = await createChild(http.baseUrl, session);
    await db.query(
      `UPDATE child SET username = 'trans', pin = $1 WHERE id = $2`,
      [await hashPassword('1234'), childId]
    );

    const loginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'trans', pin: '1234' }),
    });
    let cookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      cookies = mergeCookies(cookies, [header]);
    }

    const res = await fetch(`${http.baseUrl}/api/me/transition-support`, {
      headers: { Cookie: cookieHeader(cookies) },
    });
    assert.equal(res.status, 403);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('emotion_tracking hasAccess for basic_app families', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const { hasAccess } = require('../db/features');
  const familySubscriptions = require('../db/family-subscriptions');

  await seedBildstodPr3Features(db);
  const familyRes = await db.query(`INSERT INTO family (name) VALUES ('PR3 emotion') RETURNING id`);
  const familyId = familyRes.rows[0].id;
  await familySubscriptions.createForNewFamily(familyId);
  assert.equal(await hasAccess(familyId, 'emotion_tracking'), true);
  await db.query('DELETE FROM family WHERE id = $1', [familyId]);
  await db.cleanup();
});
