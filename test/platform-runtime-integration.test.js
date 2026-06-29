'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { clearPackCache } = require('../src/lib/experience-pack');

async function enableRuntimeFlag(query) {
  await query(
    `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, true, 'test')
     ON CONFLICT (key) DO UPDATE SET enabled = true`,
    ['platform_runtime_enabled']
  );
}

describe('Platform Runtime integration (DB)', () => {
  it('first activity → progression unlock → reward → parent feedback', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    clearPackCache();

    try {
      await enableRuntimeFlag(db.query);

      const fam = await db.query(
        `INSERT INTO family (name, timezone) VALUES ('Runtime Test', 'Europe/Stockholm') RETURNING id`
      );
      const familyId = fam.rows[0].id;

      const child = await db.query(
        `INSERT INTO child (family_id, name, emoji, username, pin, sort_order)
         VALUES ($1, 'Alma', '⭐', 'alma', 'hash', 0) RETURNING id`,
        [familyId]
      );
      const childId = child.rows[0].id;

      const log = await db.query(
        `INSERT INTO daily_log (child_id, date) VALUES ($1, CURRENT_DATE) RETURNING id`,
        [childId]
      );
      const item = await db.query(
        `INSERT INTO daily_log_item (daily_log_id, name, section, sort_order, star_value, completed, completed_by)
         VALUES ($1, 'Tänder', 'fm', 0, 1, true, 'child') RETURNING id`,
        [log.rows[0].id]
      );
      const itemId = item.rows[0].id;

      const platformRuntime = require('../src/lib/platform-runtime');

      const result = await platformRuntime.handleActivityComplete({
        childId,
        familyId,
        dailyLogItemId: itemId,
      }, db.query);

      assert.equal(result.ok, true);
      assert.equal(result.pack_id, 'child_se');
      assert.equal(result.reward.granted, true);
      assert.match(result.reward.feedback.parent_message, /Alma/);
      assert.equal(result.progression.newlyUnlocked.length, 2);
      assert.equal(result.progression.newlyUnlocked[0].node_id, 'routine_home_welcome_mat');

      const parentFeedback = await platformRuntime.getParentFeedback(childId, itemId, db.query);
      assert.match(parentFeedback.parent_message, /Idag tog Alma sitt första steg/);

      const childFeedback = await platformRuntime.getChildFeedback(childId, db.query);
      assert.equal(childFeedback.message, 'Du klarade det!');
      assert.ok(childFeedback.unlocked_nodes.length >= 1);
    } finally {
      await db.cleanup();
    }
  });

  it('duplicate events are idempotent', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    clearPackCache();

    try {
      await enableRuntimeFlag(db.query);

      const fam = await db.query(
        `INSERT INTO family (name, timezone) VALUES ('Dup Test', 'Europe/Stockholm') RETURNING id`
      );
      const familyId = fam.rows[0].id;
      const child = await db.query(
        `INSERT INTO child (family_id, name, emoji, username, pin, sort_order)
         VALUES ($1, 'Erik', '⭐', 'erik', 'hash', 0) RETURNING id`,
        [familyId]
      );
      const childId = child.rows[0].id;
      const log = await db.query(
        `INSERT INTO daily_log (child_id, date) VALUES ($1, CURRENT_DATE) RETURNING id`,
        [childId]
      );
      const item = await db.query(
        `INSERT INTO daily_log_item (daily_log_id, name, section, sort_order, star_value, completed, completed_by)
         VALUES ($1, 'Frukost', 'fm', 0, 1, true, 'child') RETURNING id`,
        [log.rows[0].id]
      );
      const itemId = item.rows[0].id;

      const platformRuntime = require('../src/lib/platform-runtime');
      const first = await platformRuntime.handleActivityComplete({
        childId, familyId, dailyLogItemId: itemId,
      }, db.query);
      const second = await platformRuntime.handleActivityComplete({
        childId, familyId, dailyLogItemId: itemId,
      }, db.query);

      assert.equal(first.reward.granted, true);
      assert.equal(second.duplicate, true);

      const nodes = await db.query(
        'SELECT COUNT(*)::int AS cnt FROM child_progression_node WHERE child_id = $1',
        [childId]
      );
      assert.equal(nodes.rows[0].cnt, 2);
    } finally {
      await db.cleanup();
    }
  });

  it('two children in same family get independent progression', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    clearPackCache();

    try {
      await enableRuntimeFlag(db.query);

      const fam = await db.query(
        `INSERT INTO family (name, timezone) VALUES ('Two Kids', 'Europe/Stockholm') RETURNING id`
      );
      const familyId = fam.rows[0].id;

      const children = [];
      for (const name of ['Alma', 'Bertil']) {
        const c = await db.query(
          `INSERT INTO child (family_id, name, emoji, username, pin, sort_order)
           VALUES ($1, $2, '⭐', $3, 'hash', 0) RETURNING id`,
          [familyId, name, name.toLowerCase()]
        );
        children.push(c.rows[0].id);
      }

      const platformRuntime = require('../src/lib/platform-runtime');

      for (const childId of children) {
        const log = await db.query(
          `INSERT INTO daily_log (child_id, date) VALUES ($1, CURRENT_DATE) RETURNING id`,
          [childId]
        );
        const item = await db.query(
          `INSERT INTO daily_log_item (daily_log_id, name, section, sort_order, star_value, completed, completed_by)
           VALUES ($1, 'Tänder', 'fm', 0, 1, true, 'child') RETURNING id`,
          [log.rows[0].id]
        );
        await platformRuntime.handleActivityComplete({
          childId,
          familyId,
          dailyLogItemId: item.rows[0].id,
        }, db.query);
      }

      for (const childId of children) {
        const nodes = await db.query(
          'SELECT COUNT(*)::int AS cnt FROM child_progression_node WHERE child_id = $1',
          [childId]
        );
        assert.equal(nodes.rows[0].cnt, 2, `child ${childId} should have 2 nodes`);
      }
    } finally {
      await db.cleanup();
    }
  });

  it('offline replay processes pending events', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    clearPackCache();

    try {
      await enableRuntimeFlag(db.query);

      const fam = await db.query(
        `INSERT INTO family (name, timezone) VALUES ('Replay Test', 'Europe/Stockholm') RETURNING id`
      );
      const familyId = fam.rows[0].id;
      const child = await db.query(
        `INSERT INTO child (family_id, name, emoji, username, pin, sort_order)
         VALUES ($1, 'Saga', '⭐', 'saga', 'hash', 0) RETURNING id`,
        [familyId]
      );
      const childId = child.rows[0].id;
      const log = await db.query(
        `INSERT INTO daily_log (child_id, date) VALUES ($1, CURRENT_DATE) RETURNING id`,
        [childId]
      );
      const item = await db.query(
        `INSERT INTO daily_log_item (daily_log_id, name, section, sort_order, star_value, completed, completed_by)
         VALUES ($1, 'Påklädning', 'fm', 0, 1, true, 'child') RETURNING id`,
        [log.rows[0].id]
      );
      const itemId = item.rows[0].id;

      const progressionDb = require('../db/child-progression-node');
      await progressionDb.enqueueEvent({
        childId,
        familyId,
        eventType: 'onActivityComplete',
        idempotencyKey: `activity_complete:${childId}:${itemId}`,
        payload: { dailyLogItemId: itemId },
      }, db.query);

      const platformRuntime = require('../src/lib/platform-runtime');
      const replay = await platformRuntime.replayPendingEvents(childId, db.query);
      assert.ok(replay.replayed >= 1);

      const nodes = await db.query(
        'SELECT COUNT(*)::int AS cnt FROM child_progression_node WHERE child_id = $1',
        [childId]
      );
      assert.equal(nodes.rows[0].cnt, 2);
    } finally {
      await db.cleanup();
    }
  });
});
