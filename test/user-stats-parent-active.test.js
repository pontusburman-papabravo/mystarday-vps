'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');

async function seedParent(db, emailSuffix) {
  const fam = await db.query(
    `INSERT INTO family (name, timezone) VALUES ('User Stats Test', 'Europe/Stockholm') RETURNING id`
  );
  const familyId = fam.rows[0].id;

  const parent = await db.query(
    `INSERT INTO parent (family_id, email, password_hash, name, verified, is_admin, pending_deletion)
     VALUES ($1, $2, 'hash', 'Stats Parent', true, false, false)
     RETURNING id`,
    [familyId, `user-stats-${emailSuffix}@example.com`]
  );

  return { familyId, parentId: parent.rows[0].id };
}

async function insertLogin(db, { userId, familyId, occurredAt }) {
  await db.query(
    `INSERT INTO login_event (user_id, role, family_id, occurred_at)
     VALUES ($1, 'parent', $2, $3)`,
    [userId, familyId, occurredAt]
  );
}

describe('user-stats parent active counts', () => {
  it('counts distinct parents from login_event within 7d/30d windows', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    try {
      const { familyId, parentId } = await seedParent(db, Date.now());
      const { getParentStats } = require('../db/user-stats');

      await insertLogin(db, {
        userId: parentId,
        familyId,
        occurredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      });

      let stats = await getParentStats();
      assert.equal(stats.active_7d, 1, 'one recent login => active_7d = 1');
      assert.equal(stats.active_30d, 1, 'one recent login => active_30d = 1');

      await insertLogin(db, {
        userId: parentId,
        familyId,
        occurredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      });

      stats = await getParentStats();
      assert.equal(stats.active_7d, 1, 'two logins same parent => active_7d still 1');
      assert.equal(stats.active_30d, 1, 'two logins same parent => active_30d still 1');

      const stale = await seedParent(db, `stale-${Date.now()}`);
      await insertLogin(db, {
        userId: stale.parentId,
        familyId: stale.familyId,
        occurredAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      });

      stats = await getParentStats();
      assert.equal(stats.active_7d, 1, 'stale-only parent excluded from 7d');
      assert.equal(stats.active_30d, 1, 'login older than 30 days does not count toward active_30d');
    } finally {
      await db.cleanup();
    }
  });
});
