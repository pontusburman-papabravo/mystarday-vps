'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { clearPackCache } = require('../src/lib/experience-pack');
const gardenLoe = require('../src/lib/garden-loe');
const livingObjectDb = require('../db/living-object');

const FEATURE_SLUG = 'garden_playable';

async function seedGardenAccess(query, familyId) {
  await query(
    `INSERT INTO features (slug, name, description, status, tags, priority, complexity, estimated_hours)
     VALUES ($1, 'Trädgården', 'test', 'dev', '{}', 'high', 1, 1)
     ON CONFLICT (slug) DO UPDATE SET status = 'dev'`,
    [FEATURE_SLUG]
  );
  await query(
    `INSERT INTO family_features (family_id, feature_slug)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [familyId, FEATURE_SLUG]
  );
}

describe('garden LOE API — vertical gameplay slice (DB)', () => {
  beforeEach(() => clearPackCache());

  it('plant locked until activity completed today, then full sunflower loop persists', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    try {
      const fam = await db.query(
        `INSERT INTO family (name, timezone) VALUES ('Garden LOE', 'Europe/Stockholm') RETURNING id`
      );
      const familyId = fam.rows[0].id;
      await seedGardenAccess(db.query, familyId);

      const child = await db.query(
        `INSERT INTO child (family_id, name, emoji, username, pin, sort_order, timezone)
         VALUES ($1, 'Olle', '🌻', 'olle', 'hash', 0, 'Europe/Stockholm') RETURNING id`,
        [familyId]
      );
      const childId = child.rows[0].id;

      let locked = await gardenLoe.getSlots(childId, familyId, db.query);
      assert.equal(locked.plant_unlocked, false);
      assert.equal(locked.slots[0].state_key, 'empty');
      assert.equal(locked.slots[0].plant_locked, true);
      assert.equal(locked.slots[0].available_verbs.length, 0);

      const plantDenied = await gardenLoe.performVerb({
        childId,
        familyId,
        slotId: 'bed_1',
        verb: 'plant',
      }, db.query);
      assert.equal(plantDenied.ok, false);
      assert.equal(plantDenied.error, 'plant_locked');

      const log = await db.query(
        `INSERT INTO daily_log (child_id, date) VALUES ($1, CURRENT_DATE) RETURNING id`,
        [childId]
      );
      await db.query(
        `INSERT INTO daily_log_item (daily_log_id, name, section, sort_order, star_value, completed, completed_by)
         VALUES ($1, 'Tänder', 'fm', 0, 1, true, 'child')`,
        [log.rows[0].id]
      );

      let unlocked = await gardenLoe.getSlots(childId, familyId, db.query);
      assert.equal(unlocked.plant_unlocked, true);
      assert.equal(unlocked.slots[0].available_verbs[0].verb, 'plant');

      const planted = await gardenLoe.performVerb({
        childId,
        familyId,
        slotId: 'bed_1',
        verb: 'plant',
      }, db.query);
      assert.equal(planted.ok, true);
      assert.equal(planted.slot.state_key, 'planted');
      assert.equal(planted.slot.timer_remaining_ms, undefined);
      assert.match(planted.child_message_sv, /planterade/i);

      const row = await livingObjectDb.getBySlot(childId, 'garden', 'bed_1', db.query);
      assert.ok(row);
      assert.equal(row.state_key, 'planted');

      const watered = await gardenLoe.performVerb({
        childId,
        familyId,
        slotId: 'bed_1',
        verb: 'water',
      }, db.query);
      assert.equal(watered.ok, true);
      assert.equal(watered.slot.state_key, 'watered');
      assert.ok(watered.slot.timer_remaining_ms > 0);
      assert.match(watered.child_message_sv, /vattnade/i);

      const wateredRow = await livingObjectDb.getBySlot(childId, 'garden', 'bed_1', db.query);
      assert.equal(wateredRow.state_key, 'watered');

      await db.query(
        `UPDATE living_object_instance
         SET state_data = $1::jsonb
         WHERE id = $2`,
        [JSON.stringify({ timer_started_at: new Date(Date.now() - 35000).toISOString() }), wateredRow.id]
      );

      const bloomingSlots = await gardenLoe.getSlots(childId, familyId, db.query);
      assert.equal(bloomingSlots.slots[0].state_key, 'blooming');
      assert.equal(bloomingSlots.slots[0].available_verbs[0].verb, 'harvest');

      const harvested = await gardenLoe.performVerb({
        childId,
        familyId,
        slotId: 'bed_1',
        verb: 'harvest',
      }, db.query);
      assert.equal(harvested.ok, true);
      assert.equal(harvested.slot.state_key, 'harvested');
      assert.match(harvested.child_message_sv, /skördade/i);

      const afterReload = await gardenLoe.getSlots(childId, familyId, db.query);
      assert.equal(afterReload.slots[0].state_key, 'harvested');
      assert.equal(afterReload.slots[0].available_verbs.length, 0);
    } finally {
      await db.cleanup();
    }
  });
});
