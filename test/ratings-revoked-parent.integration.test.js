'use strict';

/**
 * Revoked parent_child must not read or write parent ratings on child daily log items.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { hashPassword } = require('../src/lib/hash');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function loginParent(baseUrl, email, password) {
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const text = await loginRes.text();
  assert.equal(loginRes.status, 200, text);
  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  const body = JSON.parse(text);
  return { cookies, csrfToken: body.csrfToken };
}

async function seedDailyLogItem(db, childId) {
  const log = await db.query(
    `INSERT INTO daily_log (child_id, date) VALUES ($1, CURRENT_DATE) RETURNING id`,
    [childId]
  );
  const item = await db.query(
    `INSERT INTO daily_log_item (daily_log_id, name, section, sort_order, star_value, completed)
     VALUES ($1, 'Aktivitet', 'morgon', 0, 1, true) RETURNING id`,
    [log.rows[0].id]
  );
  return item.rows[0].id;
}

test('revoked shared parent cannot rate or read ratings; primary and cross-family denied', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const password = 'ratings-authz-pass-1';
  const passwordHash = await hashPassword(password);
  const familyRes = await db.query(
    `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('Ratings', 'Europe/Stockholm', true) RETURNING id`
  );
  const familyId = familyRes.rows[0].id;

  const primaryEmail = `primary-ratings-${Date.now()}@example.com`;
  const sharedEmail = `shared-ratings-${Date.now()}@example.com`;
  const primaryRes = await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, verified, onboarding_completed)
     VALUES ($1, $2, $3, 'Primary', true, true) RETURNING id`,
    [primaryEmail, passwordHash, familyId]
  );
  const sharedRes = await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, verified, onboarding_completed)
     VALUES ($1, $2, $3, 'Shared', true, true) RETURNING id`,
    [sharedEmail, passwordHash, familyId]
  );
  const childRes = await db.query(
    `INSERT INTO child (family_id, name, emoji, username) VALUES ($1, 'Barn', '⭐', 'ratings_barn') RETURNING id`,
    [familyId]
  );
  const childId = childRes.rows[0].id;
  await db.query(
    `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary'), ($3, $2, 'shared')`,
    [primaryRes.rows[0].id, childId, sharedRes.rows[0].id]
  );

  const otherFamily = await db.query(
    `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('Other', 'Europe/Stockholm', true) RETURNING id`
  );
  const otherEmail = `other-ratings-${Date.now()}@example.com`;
  const otherParent = await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, verified, onboarding_completed)
     VALUES ($1, $2, $3, 'Other', true, true) RETURNING id`,
    [otherEmail, passwordHash, otherFamily.rows[0].id]
  );

  const itemId = await seedDailyLogItem(db, childId);

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const sharedSession = await loginParent(http.baseUrl, sharedEmail, password);

    const postBefore = await fetch(`${http.baseUrl}/api/daily-log-items/${itemId}/rate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(sharedSession.cookies),
        'X-CSRF-Token': sharedSession.csrfToken,
      },
      body: JSON.stringify({ score: 4 }),
    });
    assert.equal(postBefore.status, 200);

    const getBefore = await fetch(`${http.baseUrl}/api/daily-log-items/${itemId}/ratings`, {
      headers: { Cookie: cookieHeader(sharedSession.cookies) },
    });
    assert.equal(getBefore.status, 200);
    const ratingsBefore = await getBefore.json();
    assert.equal(ratingsBefore.parent_score, 4);

    await db.query(
      `UPDATE parent_child SET revoked_at = NOW(), revoked_by = $1
       WHERE parent_id = $2 AND child_id = $3`,
      [primaryRes.rows[0].id, sharedRes.rows[0].id, childId]
    );

    const postAfter = await fetch(`${http.baseUrl}/api/daily-log-items/${itemId}/rate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(sharedSession.cookies),
        'X-CSRF-Token': sharedSession.csrfToken,
      },
      body: JSON.stringify({ score: 5 }),
    });
    assert.equal(postAfter.status, 404);

    const getAfter = await fetch(`${http.baseUrl}/api/daily-log-items/${itemId}/ratings`, {
      headers: { Cookie: cookieHeader(sharedSession.cookies) },
    });
    assert.equal(getAfter.status, 404);

    const primarySession = await loginParent(http.baseUrl, primaryEmail, password);
    const primaryPost = await fetch(`${http.baseUrl}/api/daily-log-items/${itemId}/rate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(primarySession.cookies),
        'X-CSRF-Token': primarySession.csrfToken,
      },
      body: JSON.stringify({ score: 3 }),
    });
    assert.equal(primaryPost.status, 200);

    const otherSession = await loginParent(http.baseUrl, otherEmail, password);
    const crossPost = await fetch(`${http.baseUrl}/api/daily-log-items/${itemId}/rate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(otherSession.cookies),
        'X-CSRF-Token': otherSession.csrfToken,
      },
      body: JSON.stringify({ score: 1 }),
    });
    assert.equal(crossPost.status, 404);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
