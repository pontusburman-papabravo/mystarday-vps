'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { hashPassword } = require('../src/lib/hash');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function childLogin(baseUrl, username, pin) {
  const loginRes = await fetch(`${baseUrl}/api/auth/child-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, pin }),
  });
  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  const body = JSON.parse(await loginRes.text());
  return { status: loginRes.status, cookies, body };
}

test('child reward/goal APIs return stable codes (no Swedish user-facing errors)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const email = `child-treasure-${Date.now()}@example.com`;
    const passwordHash = await hashPassword('parent-pass-1');
    const familyRes = await db.query(
      `INSERT INTO family (name, timezone, preferred_locale, is_lifetime_free)
       VALUES ('Child treasure', 'Europe/Stockholm', 'en-GB', true) RETURNING id`
    );
    const familyId = familyRes.rows[0].id;
    await db.query(
      `INSERT INTO family_subscriptions (family_id, tier, trial_expires_at, components)
       VALUES ($1, 'lifetime_free', NULL, $2)`,
      [familyId, JSON.stringify([{ component: 'basic_app', state: 'active' }])]
    );
    await db.query(
      `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified)
       VALUES ($1, $2, $3, 'Parent', true, true)`,
      [email, passwordHash, familyId]
    );
    const childRes = await db.query(
      `INSERT INTO child (family_id, name, emoji, username, sort_order, pin)
       VALUES ($1, 'Kid', '🌟', 'kidtreasure', 0, $2) RETURNING id`,
      [familyId, await hashPassword('1234')]
    );
    const childId = childRes.rows[0].id;
    const parentRes = await db.query('SELECT id FROM parent WHERE family_id = $1', [familyId]);
    await db.query(
      'INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, $3)',
      [parentRes.rows[0].id, childId, 'primary']
    );

    const session = await childLogin(http.baseUrl, 'kidtreasure', '1234');
    assert.equal(session.status, 200);

    const missingReward = await fetch(`${http.baseUrl}/api/me/rewards/00000000-0000-0000-0000-000000000099/redeem`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader(session.cookies),
        'Content-Type': 'application/json',
        'X-CSRF-Token': session.body.csrfToken,
      },
    });
    const missingBody = JSON.parse(await missingReward.text());
    assert.equal(missingReward.status, 404);
    assert.equal(missingBody.code, 'CHILD_REWARD_NOT_FOUND');
    assert.equal(missingBody.error, undefined);

    const badGoal = await fetch(`${http.baseUrl}/api/me/goal`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader(session.cookies),
        'Content-Type': 'application/json',
        'X-CSRF-Token': session.body.csrfToken,
      },
      body: JSON.stringify({ reward_id: '00000000-0000-0000-0000-000000000099' }),
    });
    const badGoalBody = JSON.parse(await badGoal.text());
    assert.equal(badGoal.status, 404);
    assert.equal(badGoalBody.code, 'CHILD_REWARD_NOT_FOUND');

    const rewardRes = await db.query(
      `INSERT INTO reward (family_id, name, icon, star_cost, requires_approval, is_active)
       VALUES ($1, 'Ice cream', '🍦', 3, false, true) RETURNING id`,
      [familyId]
    );
    const rewardId = rewardRes.rows[0].id;

    const goalSet = await fetch(`${http.baseUrl}/api/me/goal`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader(session.cookies),
        'Content-Type': 'application/json',
        'X-CSRF-Token': session.body.csrfToken,
      },
      body: JSON.stringify({ reward_id: rewardId }),
    });
    const goalBody = JSON.parse(await goalSet.text());
    assert.equal(goalSet.status, 201);
    assert.equal(goalBody.code, 'CHILD_GOAL_SET');
    assert.equal(goalBody.reward_name, 'Ice cream');
    assert.equal(goalBody.message, undefined);

    const duplicateGoal = await fetch(`${http.baseUrl}/api/me/goal`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader(session.cookies),
        'Content-Type': 'application/json',
        'X-CSRF-Token': session.body.csrfToken,
      },
      body: JSON.stringify({ reward_id: rewardId }),
    });
    const dupBody = JSON.parse(await duplicateGoal.text());
    assert.equal(duplicateGoal.status, 409);
    assert.equal(dupBody.code, 'CHILD_GOAL_ALREADY_ACTIVE');
  } finally {
    await http.close();
    await db.cleanup();
  }
});
