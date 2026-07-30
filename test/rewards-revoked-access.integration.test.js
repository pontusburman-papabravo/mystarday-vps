'use strict';

/**
 * Revoked parent_child must not read, mutate, or receive reward notifications.
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

test('revoked shared parent loses rewards redemptions access', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const email = `revoked-rewards-${Date.now()}@example.com`;
  const password = 'revoked-test-pass-1';
  const passwordHash = await hashPassword(password);

  const familyRes = await db.query(
    `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('Revoked rewards', 'Europe/Stockholm', true) RETURNING id`
  );
  const familyId = familyRes.rows[0].id;

  const primaryRes = await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified)
     VALUES ($1, $2, $3, 'Primary', true, true) RETURNING id`,
    [`primary-${Date.now()}@example.com`, passwordHash, familyId]
  );
  const primaryId = primaryRes.rows[0].id;

  const sharedRes = await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified)
     VALUES ($1, $2, $3, 'Shared', true, true) RETURNING id`,
    [email, passwordHash, familyId]
  );
  const sharedId = sharedRes.rows[0].id;

  const childRes = await db.query(
    `INSERT INTO child (family_id, name, emoji, username) VALUES ($1, 'Barn', '⭐', 'barn1') RETURNING id`,
    [familyId]
  );
  const childId = childRes.rows[0].id;

  await db.query(
    `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary'), ($3, $2, 'shared')`,
    [primaryId, childId, sharedId]
  );

  const rewardRes = await db.query(
    `INSERT INTO reward (family_id, name, icon, star_cost, requires_approval, is_active)
     VALUES ($1, 'Glass', '🍦', 1, true, true) RETURNING id`,
    [familyId]
  );
  const rewardId = rewardRes.rows[0].id;

  const redemptionRes = await db.query(
    `INSERT INTO reward_redemption (reward_id, child_id, status, star_cost, reward_name, reward_icon)
     VALUES ($1, $2, 'pending', 1, 'Glass', '🍦') RETURNING id`,
    [rewardId, childId]
  );
  const redemptionId = redemptionRes.rows[0].id;

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await loginParent(http.baseUrl, email, password);

    const listBefore = await fetch(`${http.baseUrl}/api/rewards/redemptions`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    assert.equal(listBefore.status, 200);
    const rowsBefore = await listBefore.json();
    assert.ok(rowsBefore.some((r) => r.id === redemptionId));

    await db.query(
      `UPDATE parent_child SET revoked_at = NOW(), revoked_by = $1 WHERE parent_id = $2 AND child_id = $3`,
      [primaryId, sharedId, childId]
    );

    const listAfter = await fetch(`${http.baseUrl}/api/rewards/redemptions`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    assert.equal(listAfter.status, 200);
    const rowsAfter = await listAfter.json();
    assert.equal(rowsAfter.length, 0);

    const approveRes = await fetch(`${http.baseUrl}/api/rewards/redemptions/${redemptionId}/approve`, {
      method: 'PUT',
      headers: {
        Cookie: cookieHeader(session.cookies),
        'X-CSRF-Token': session.csrfToken,
      },
    });
    assert.equal(approveRes.status, 404);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
