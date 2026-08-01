'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { hashPassword } = require('../src/lib/hash');
const { wipeQaFamilyData } = require('../scripts/lib/rc1-qa-reset-manifest');
const {
  RC1_QA_FAMILY_NAME,
  RC1_QA_CHILD_USERNAME,
} = require('./support/rc1-qa-fixture');

test('wipeQaFamilyData clears goals, manual stars, redemptions; keeps family shell', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const familyRes = await db.query(
    `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ($1, 'Europe/Stockholm', true) RETURNING id`,
    [RC1_QA_FAMILY_NAME]
  );
  const familyId = familyRes.rows[0].id;
  const parentRes = await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, verified, onboarding_completed)
     VALUES ($1, $2, $3, 'P', true, true) RETURNING id`,
    [`rc1-reset-${Date.now()}@example.com`, await hashPassword('pw'), familyId]
  );
  const parentId = parentRes.rows[0].id;
  const childRes = await db.query(
    `INSERT INTO child (family_id, name, username, pin, emoji) VALUES ($1, 'C', $2, $3, '⭐') RETURNING id`,
    [familyId, RC1_QA_CHILD_USERNAME, await hashPassword('1111')]
  );
  const childId = childRes.rows[0].id;

  const rewardRes = await db.query(
    `INSERT INTO reward (family_id, name, icon, star_cost) VALUES ($1, 'R', '🎁', 5) RETURNING id`,
    [familyId]
  );
  const rewardId = rewardRes.rows[0].id;

  await db.query(
    `INSERT INTO child_reward_goal (child_id, reward_id, status) VALUES ($1, $2, 'active')`,
    [childId, rewardId]
  );
  await db.query(
    `INSERT INTO child_reward_goal_change_request (child_id, from_reward_id, to_reward_id, status)
     VALUES ($1, $2, $2, 'pending')`,
    [childId, rewardId]
  );
  await db.query(
    `INSERT INTO manual_star_grant (child_id, granted_by, star_count, reason) VALUES ($1, $2, 3, 'qa')`,
    [childId, parentId]
  );
  await db.query(
    `INSERT INTO reward_redemption (reward_id, child_id, status, star_cost) VALUES ($1, $2, 'pending', 5)`,
    [rewardId, childId]
  );

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await wipeQaFamilyData(client, familyId);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const counts = await db.query(
    `SELECT
       (SELECT COUNT(*)::int FROM child_reward_goal WHERE child_id = $2) AS goals,
       (SELECT COUNT(*)::int FROM child_reward_goal_change_request WHERE child_id = $2) AS goal_req,
       (SELECT COUNT(*)::int FROM manual_star_grant WHERE child_id = $2) AS manual,
       (SELECT COUNT(*)::int FROM reward_redemption WHERE child_id = $2) AS redemptions,
       (SELECT COUNT(*)::int FROM reward WHERE family_id = $1) AS rewards,
       (SELECT COUNT(*)::int FROM family WHERE id = $1) AS families,
       (SELECT COUNT(*)::int FROM parent WHERE family_id = $1) AS parents,
       (SELECT COUNT(*)::int FROM child WHERE family_id = $1) AS children`,
    [familyId, childId]
  );
  const c = counts.rows[0];
  assert.equal(c.goals, 0);
  assert.equal(c.goal_req, 0);
  assert.equal(c.manual, 0);
  assert.equal(c.redemptions, 0);
  assert.equal(c.rewards, 0);
  assert.equal(c.families, 1);
  assert.equal(c.parents, 1);
  assert.equal(c.children, 1);

  await db.query('DELETE FROM child WHERE family_id = $1', [familyId]);
  await db.query('DELETE FROM parent WHERE family_id = $1', [familyId]);
  await db.query('DELETE FROM family WHERE id = $1', [familyId]);
  await db.cleanup();
});
