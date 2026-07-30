'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp, cookieHeader, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { hashPassword } = require('../src/lib/hash');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

test('deactivating reward preserves redemption snapshots', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const email = `hist-${Date.now()}@example.com`;
  const password = 'hist-pass-1';
  const familyRes = await db.query(
    `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('H', 'Europe/Stockholm', true) RETURNING id`
  );
  const familyId = familyRes.rows[0].id;
  const parentRes = await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, verified, onboarding_completed)
     VALUES ($1, $2, $3, 'P', true, true) RETURNING id`,
    [email, await hashPassword(password), familyId]
  );
  const childRes = await db.query(
    `INSERT INTO child (family_id, name, username, pin, emoji) VALUES ($1, 'B', 'barn', $2, '⭐') RETURNING id`,
    [familyId, await hashPassword('1111')]
  );
  await db.query(
    `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary')`,
    [parentRes.rows[0].id, childRes.rows[0].id]
  );
  await db.query(
    `INSERT INTO manual_star_grant (child_id, granted_by, star_count, reason) VALUES ($1, $2, 10, 'test')`,
    [childRes.rows[0].id, parentRes.rows[0].id]
  );

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  const loginRes = await fetch(`${http.baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  let parentCookies = {};
  for (const h of getSetCookieHeaders(loginRes)) parentCookies = mergeCookies(parentCookies, [h]);
  const parentSession = JSON.parse(await loginRes.text());

  const rewardRes = await fetch(`${http.baseUrl}/api/rewards`, {
    method: 'POST',
    headers: {
      Cookie: cookieHeader(parentCookies),
      'X-CSRF-Token': parentSession.csrfToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: 'Original', icon: '🎁', star_cost: 3, requires_approval: false }),
  });
  const reward = await rewardRes.json();

  const childLogin = await fetch(`${http.baseUrl}/api/auth/child-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'barn', pin: '1111' }),
  });
  let childCookies = {};
  for (const h of getSetCookieHeaders(childLogin)) childCookies = mergeCookies(childCookies, [h]);
  const childBody = JSON.parse(await childLogin.text());

  await fetch(`${http.baseUrl}/api/me/rewards/${reward.id}/redeem`, {
    method: 'POST',
    headers: {
      Cookie: cookieHeader(childCookies),
      'X-CSRF-Token': childBody.csrfToken,
    },
  });

  await fetch(`${http.baseUrl}/api/rewards/${reward.id}`, {
    method: 'PUT',
    headers: {
      Cookie: cookieHeader(parentCookies),
      'X-CSRF-Token': parentSession.csrfToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: 'Changed', icon: '🔥', star_cost: 9 }),
  });

  await fetch(`${http.baseUrl}/api/rewards/${reward.id}`, {
    method: 'DELETE',
    headers: {
      Cookie: cookieHeader(parentCookies),
      'X-CSRF-Token': parentSession.csrfToken,
    },
  });

  try {
    const hist = await db.query(
      `SELECT reward_name, reward_icon, star_cost, status FROM reward_redemption WHERE reward_id = $1`,
      [reward.id]
    );
    assert.equal(hist.rows[0].reward_name, 'Original');
    assert.equal(hist.rows[0].reward_icon, '🎁');
    assert.equal(hist.rows[0].star_cost, 3);
    assert.equal(hist.rows[0].status, 'auto');

    const redeemAgain = await fetch(`${http.baseUrl}/api/me/rewards/${reward.id}/redeem`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader(childCookies),
        'X-CSRF-Token': childBody.csrfToken,
      },
    });
    assert.equal(redeemAgain.status, 400);
    const againBody = await redeemAgain.json();
    assert.equal(againBody.code, 'reward_inactive');
  } finally {
    await http.close();
    await db.cleanup();
  }
});
