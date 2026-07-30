'use strict';

/**
 * Reward redemption integrity — DB integration tests with real concurrency.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { hashPassword } = require('../src/lib/hash');
const { getStarBalance } = require('../src/routes/rewards');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
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
  return { status: loginRes.status, cookies, body, csrfToken: body.csrfToken };
}

async function setupTwoChildFamily(http, db) {
  const email = `rewards-int-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const password = 'rewards-test-pass-1';
  const passwordHash = await hashPassword(password);

  const familyRes = await db.query(
    `INSERT INTO family (name, timezone, is_lifetime_free)
     VALUES ('Rewards integrity test', 'Europe/Stockholm', true) RETURNING id`
  );
  const familyId = familyRes.rows[0].id;

  const parentRes = await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified)
     VALUES ($1, $2, $3, 'Parent', true, true) RETURNING id`,
    [email, passwordHash, familyId]
  );
  const parentId = parentRes.rows[0].id;

  const child1Res = await db.query(
    `INSERT INTO child (family_id, name, emoji, username, sort_order)
     VALUES ($1, 'Anna', '🌟', 'anna', 0) RETURNING id`,
    [familyId]
  );
  const child2Res = await db.query(
    `INSERT INTO child (family_id, name, emoji, username, sort_order)
     VALUES ($1, 'Erik', '⭐', 'erik', 1) RETURNING id`,
    [familyId]
  );
  const child1Id = child1Res.rows[0].id;
  const child2Id = child2Res.rows[0].id;

  const pinHash1 = await hashPassword('1111');
  const pinHash2 = await hashPassword('2222');
  await db.query(`UPDATE child SET pin = $1 WHERE id = $2`, [pinHash1, child1Id]);
  await db.query(`UPDATE child SET pin = $1 WHERE id = $2`, [pinHash2, child2Id]);

  await db.query(
    `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary'), ($1, $3, 'primary')`,
    [parentId, child1Id, child2Id]
  );

  const loginRes = await fetch(`${http.baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginText = await loginRes.text();
  assert.equal(loginRes.status, 200, loginText);
  const loginBody = JSON.parse(loginText);

  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }

  const session = { email, password, cookies, csrfToken: loginBody.csrfToken };

  return { session, familyId, parentId, child1Id, child2Id };
}

async function grantStars(db, childId, parentId, count) {
  await db.query(
    `INSERT INTO manual_star_grant (child_id, granted_by, star_count, reason)
     VALUES ($1, $2, $3, 'test')`,
    [childId, parentId, count]
  );
}

async function createReward(http, session, { name = 'Glass', star_cost = 5, icon = '🍦' } = {}) {
  const res = await fetch(`${http.baseUrl}/api/rewards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
    body: JSON.stringify({ name, icon, star_cost, requires_approval: true }),
  });
  const text = await res.text();
  assert.equal(res.status, 201, text);
  return JSON.parse(text).id;
}

async function redeemReward(http, childCookies, rewardId, csrfToken) {
  const headers = { Cookie: cookieHeader(childCookies) };
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  return fetch(`${http.baseUrl}/api/me/rewards/${rewardId}/redeem`, {
    method: 'POST',
    headers,
  });
}

async function denyRedemption(http, session, redemptionId) {
  return fetch(`${http.baseUrl}/api/rewards/redemptions/${redemptionId}/deny`, {
    method: 'PUT',
    headers: {
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
  });
}

async function approveRedemption(http, session, redemptionId) {
  return fetch(`${http.baseUrl}/api/rewards/redemptions/${redemptionId}/approve`, {
    method: 'PUT',
    headers: {
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
  });
}

describe('reward integrity migration', () => {
  test('migration defines snapshot columns and pending uniqueness indexes', () => {
    const mig = fs.readFileSync(
      path.join(__dirname, '../migrations/1810000000013_reward_integrity_constraints.js'),
      'utf8'
    );
    assert.match(mig, /reward_name VARCHAR/);
    assert.match(mig, /idx_reward_redemption_one_pending_per_reward/);
    assert.match(mig, /idx_reward_redemption_one_fulfilled_per_reward/);
    assert.match(mig, /reward_redemption_status_valid/);
  });
});

describe('concurrent exclusive redemption', () => {
  test('two children: exactly one succeeds, one 409, single pending row', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { createApp } = require('../app');
    const http = await listenApp(createApp);

    try {
      const { session, parentId, child1Id, child2Id } = await setupTwoChildFamily(http, db);
      await grantStars(db, child1Id, parentId, 20);
      await grantStars(db, child2Id, parentId, 20);
      const rewardId = await createReward(http, session, { name: 'Exklusiv belöning', star_cost: 5 });

      const child1 = await childLogin(http.baseUrl, 'anna', '1111');
      const child2 = await childLogin(http.baseUrl, 'erik', '2222');
      assert.equal(child1.status, 200);
      assert.equal(child2.status, 200);

      const [r1, r2] = await Promise.all([
        redeemReward(http, child1.cookies, rewardId, child1.csrfToken),
        redeemReward(http, child2.cookies, rewardId, child2.csrfToken),
      ]);

      const statuses = [r1.status, r2.status].sort();
      assert.deepEqual(statuses, [201, 409]);

      const rows = await db.query(
        `SELECT child_id, status FROM reward_redemption WHERE reward_id = $1`,
        [rewardId]
      );
      assert.equal(rows.rows.length, 1);
      assert.equal(rows.rows[0].status, 'pending');

      const winnerChildId = rows.rows[0].child_id;
      const balance = await getStarBalance(winnerChildId);
      assert.equal(balance, 20, 'stars not deducted until approval');
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});

describe('same-child concurrent redemption', () => {
  test('duplicate pending rejected with 409', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { createApp } = require('../app');
    const http = await listenApp(createApp);

    try {
      const { session, parentId, child1Id } = await setupTwoChildFamily(http, db);
      await grantStars(db, child1Id, parentId, 20);
      const rewardId = await createReward(http, session);

      const child1 = await childLogin(http.baseUrl, 'anna', '1111');
      const [r1, r2] = await Promise.all([
        redeemReward(http, child1.cookies, rewardId, child1.csrfToken),
        redeemReward(http, child1.cookies, rewardId, child1.csrfToken),
      ]);

      const statuses = [r1.status, r2.status].sort();
      assert.deepEqual(statuses, [201, 409]);

      const rows = await db.query(
        `SELECT COUNT(*)::int AS n FROM reward_redemption WHERE child_id = $1 AND reward_id = $2`,
        [child1Id, rewardId]
      );
      assert.equal(rows.rows[0].n, 1);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});

describe('denied exclusive redemption semantics', () => {
  test('after deny: other child and same child can redeem; approved blocks all', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { createApp } = require('../app');
    const http = await listenApp(createApp);

    try {
      const base = await setupTwoChildFamily(http, db);
      await grantStars(db, base.child1Id, base.parentId, 20);
      await grantStars(db, base.child2Id, base.parentId, 20);
      const rewardId = await createReward(http, base.session, { name: 'Exklusiv glass', star_cost: 5 });

      const childA = await childLogin(http.baseUrl, 'anna', '1111');
      const childB = await childLogin(http.baseUrl, 'erik', '2222');

      const firstRedeem = await redeemReward(http, childA.cookies, rewardId, childA.csrfToken);
      assert.equal(firstRedeem.status, 201);

      const pendingRow = await db.query(
        `SELECT id, status, redeemed_at FROM reward_redemption WHERE reward_id = $1`,
        [rewardId]
      );
      assert.equal(pendingRow.rows.length, 1);
      assert.equal(pendingRow.rows[0].status, 'pending');
      assert.equal(pendingRow.rows[0].redeemed_at, null, 'pending must not set redeemed_at');

      const denyRes = await denyRedemption(http, base.session, pendingRow.rows[0].id);
      assert.equal(denyRes.status, 200);

      const deniedRow = await db.query(
        `SELECT status, redeemed_at FROM reward_redemption WHERE id = $1`,
        [pendingRow.rows[0].id]
      );
      assert.equal(deniedRow.rows[0].status, 'denied');
      assert.equal(deniedRow.rows[0].redeemed_at, null, 'denied must clear redeemed_at');

      const childBRedeem = await redeemReward(http, childB.cookies, rewardId, childB.csrfToken);
      assert.equal(childBRedeem.status, 201, 'child B should redeem after deny');

      const childBRow = await db.query(
        `SELECT id, status FROM reward_redemption WHERE reward_id = $1 AND child_id = $2 AND status = 'pending'`,
        [rewardId, base.child2Id]
      );
      assert.equal(childBRow.rows.length, 1);

      const denyB = await denyRedemption(http, base.session, childBRow.rows[0].id);
      assert.equal(denyB.status, 200);

      const childARedeemAgain = await redeemReward(http, childA.cookies, rewardId, childA.csrfToken);
      assert.equal(childARedeemAgain.status, 201, 'child A should redeem again after deny');

      const childAFinal = await db.query(
        `SELECT id FROM reward_redemption WHERE reward_id = $1 AND child_id = $2 AND status = 'pending'`,
        [rewardId, base.child1Id]
      );
      const approveRes = await approveRedemption(http, base.session, childAFinal.rows[0].id);
      assert.equal(approveRes.status, 200);

      const approvedRow = await db.query(
        `SELECT status, redeemed_at FROM reward_redemption WHERE id = $1`,
        [childAFinal.rows[0].id]
      );
      assert.equal(approvedRow.rows[0].status, 'approved');
      assert.ok(approvedRow.rows[0].redeemed_at, 'approved must set redeemed_at');

      const childBBlocked = await redeemReward(http, childB.cookies, rewardId, childB.csrfToken);
      assert.equal(childBBlocked.status, 409);

      const childABlocked = await redeemReward(http, childA.cookies, rewardId, childA.csrfToken);
      assert.equal(childABlocked.status, 409);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});

describe('approve and deny atomicity', () => {
  test('approve + deny: exactly one succeeds', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { createApp } = require('../app');
    const http = await listenApp(createApp);

    try {
      const base = await setupTwoChildFamily(http, db);
      await grantStars(db, base.child1Id, base.parentId, 10);
      const rewardId = await createReward(http, base.session, { star_cost: 3 });
      const child = await childLogin(http.baseUrl, 'anna', '1111');
      const redeemRes = await redeemReward(http, child.cookies, rewardId, child.csrfToken);
      assert.equal(redeemRes.status, 201);
      const redemption = await db.query(
        `SELECT id FROM reward_redemption WHERE child_id = $1`,
        [base.child1Id]
      );
      const redemptionId = redemption.rows[0].id;

      const headers = {
        Cookie: cookieHeader(base.session.cookies),
        'X-CSRF-Token': base.session.csrfToken,
      };

      const [approveRes, denyRes] = await Promise.all([
        fetch(`${http.baseUrl}/api/rewards/redemptions/${redemptionId}/approve`, {
          method: 'PUT',
          headers,
        }),
        fetch(`${http.baseUrl}/api/rewards/redemptions/${redemptionId}/deny`, {
          method: 'PUT',
          headers,
        }),
      ]);

      const okCount = [approveRes, denyRes].filter((r) => r.status === 200).length;
      const conflictCount = [approveRes, denyRes].filter((r) => r.status === 409).length;
      assert.equal(okCount, 1);
      assert.equal(conflictCount, 1);

      const final = await db.query(
        `SELECT status FROM reward_redemption WHERE id = $1`,
        [redemptionId]
      );
      assert.ok(['approved', 'denied'].includes(final.rows[0].status));

      const balance = await getStarBalance(base.child1Id);
      if (final.rows[0].status === 'approved') {
        assert.equal(balance, 7);
      } else {
        assert.equal(balance, 10);
      }
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('approve + approve: one succeeds, one 409', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { createApp } = require('../app');
    const http = await listenApp(createApp);

    try {
      const base = await setupTwoChildFamily(http, db);
      await grantStars(db, base.child1Id, base.parentId, 10);
      const rewardId = await createReward(http, base.session, { star_cost: 4 });
      const child = await childLogin(http.baseUrl, 'anna', '1111');
      await redeemReward(http, child.cookies, rewardId, child.csrfToken);
      const redemption = await db.query(
        `SELECT id FROM reward_redemption WHERE child_id = $1`,
        [base.child1Id]
      );
      const redemptionId = redemption.rows[0].id;
      const headers = {
        Cookie: cookieHeader(base.session.cookies),
        'X-CSRF-Token': base.session.csrfToken,
      };

      const [a1, a2] = await Promise.all([
        fetch(`${http.baseUrl}/api/rewards/redemptions/${redemptionId}/approve`, { method: 'PUT', headers }),
        fetch(`${http.baseUrl}/api/rewards/redemptions/${redemptionId}/approve`, { method: 'PUT', headers }),
      ]);

      assert.equal([a1.status, a2.status].filter((s) => s === 200).length, 1);
      assert.equal([a1.status, a2.status].filter((s) => s === 409).length, 1);
      assert.equal(await getStarBalance(base.child1Id), 6);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('deny + deny: one succeeds, one 409', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { createApp } = require('../app');
    const http = await listenApp(createApp);

    try {
      const base = await setupTwoChildFamily(http, db);
      await grantStars(db, base.child1Id, base.parentId, 10);
      const rewardId = await createReward(http, base.session, { star_cost: 4 });
      const child = await childLogin(http.baseUrl, 'anna', '1111');
      await redeemReward(http, child.cookies, rewardId, child.csrfToken);
      const redemption = await db.query(
        `SELECT id FROM reward_redemption WHERE child_id = $1`,
        [base.child1Id]
      );
      const redemptionId = redemption.rows[0].id;
      const headers = {
        Cookie: cookieHeader(base.session.cookies),
        'X-CSRF-Token': base.session.csrfToken,
      };

      const [d1, d2] = await Promise.all([
        fetch(`${http.baseUrl}/api/rewards/redemptions/${redemptionId}/deny`, { method: 'PUT', headers }),
        fetch(`${http.baseUrl}/api/rewards/redemptions/${redemptionId}/deny`, { method: 'PUT', headers }),
      ]);

      assert.equal([d1.status, d2.status].filter((s) => s === 200).length, 1);
      assert.equal([d1.status, d2.status].filter((s) => s === 409).length, 1);
      assert.equal(await getStarBalance(base.child1Id), 10);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});

describe('soft delete preserves history', () => {
  test('archived reward hidden from child list but redemption history remains', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { createApp } = require('../app');
    const http = await listenApp(createApp);

    try {
      const base = await setupTwoChildFamily(http, db);
      await grantStars(db, base.child1Id, base.parentId, 10);
      const rewardId = await createReward(http, base.session, { star_cost: 2 });
      const child = await childLogin(http.baseUrl, 'anna', '1111');
      await redeemReward(http, child.cookies, rewardId, child.csrfToken);

      const approveHeaders = {
        Cookie: cookieHeader(base.session.cookies),
        'X-CSRF-Token': base.session.csrfToken,
      };
      const redemption = await db.query(
        `SELECT id FROM reward_redemption WHERE child_id = $1`,
        [base.child1Id]
      );
      await fetch(`${http.baseUrl}/api/rewards/redemptions/${redemption.rows[0].id}/approve`, {
        method: 'PUT',
        headers: approveHeaders,
      });

      const balanceBefore = await getStarBalance(base.child1Id);
      assert.equal(balanceBefore, 8);

      const delRes = await fetch(`${http.baseUrl}/api/rewards/${rewardId}`, {
        method: 'DELETE',
        headers: approveHeaders,
      });
      assert.equal(delRes.status, 200);

      const listRes = await fetch(`${http.baseUrl}/api/me/rewards`, {
        headers: { Cookie: cookieHeader(child.cookies) },
      });
      const listBody = JSON.parse(await listRes.text());
      assert.equal(listBody.rewards.some((r) => r.id === rewardId), false);
      assert.ok(listBody.redemptions.length >= 1);
      assert.equal(await getStarBalance(base.child1Id), 8);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});

describe('redemption snapshots', () => {
  test('historical redemption keeps original name, icon, and star cost', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { createApp } = require('../app');
    const http = await listenApp(createApp);

    try {
      const base = await setupTwoChildFamily(http, db);
      await grantStars(db, base.child1Id, base.parentId, 15);
      const rewardId = await createReward(http, base.session, {
        name: 'Original',
        icon: '🍦',
        star_cost: 5,
      });
      const child = await childLogin(http.baseUrl, 'anna', '1111');
      await redeemReward(http, child.cookies, rewardId, child.csrfToken);

      await db.query(
        `UPDATE reward SET name = 'Changed', icon = '🎮', star_cost = 99 WHERE id = $1`,
        [rewardId]
      );

      const listRes = await fetch(`${http.baseUrl}/api/me/rewards`, {
        headers: { Cookie: cookieHeader(child.cookies) },
      });
      const listBody = JSON.parse(await listRes.text());
      const redemption = listBody.redemptions.find((r) => r.reward_id === rewardId);
      assert.ok(redemption);
      assert.equal(redemption.reward_name, 'Original');
      assert.equal(redemption.reward_icon, '🍦');
      assert.equal(redemption.star_cost, 5);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});

describe('database constraints', () => {
  test('invalid status and negative star_cost rejected', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    try {
      const { createApp } = require('../app');
      const http = await listenApp(createApp);
      const base = await setupTwoChildFamily(http, db);
      const rewardId = await createReward(http, base.session);

      await assert.rejects(
        () => db.query(
          `INSERT INTO reward_redemption (reward_id, child_id, status, star_cost)
           VALUES ($1, $2, 'bogus', 1)`,
          [rewardId, base.child1Id]
        ),
        (err) => err.code === '23514'
      );

      await assert.rejects(
        () => db.query(
          `UPDATE reward SET star_cost = -1 WHERE id = $1`,
          [rewardId]
        ),
        (err) => err.code === '23514'
      );

      await http.close();
    } finally {
      await db.cleanup();
    }
  });
});
