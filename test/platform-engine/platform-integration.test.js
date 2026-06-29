'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { setupTestDb } = require('../helpers/setup.js');
const { PlatformEngine } = require('../../src/platform-engine');
const { PgProgressionStore } = require('../../src/platform-engine/progression/store');

const pack = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/child-se-pack.json'), 'utf8'));
const progression = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/routine-home-progression.json'), 'utf8'));

describe('Platform engine integration', () => {
  it('end-to-end: pack swap without migration', async () => {
    const engine = new PlatformEngine({ enforceHandlerBudget: false });
    await engine.initialize({
      manifest: pack,
      progressionMaps: { routine_home: progression },
    });
    engine.start();

    const childId = '00000000-0000-4000-8000-000000000010';
    engine.emit('onMilestone', { child_id: childId, milestone_type: 'sprout' });

    assert.equal(
      engine.progressionRuntime.isUnlocked(childId, 'routine_home', 'routine_home_nightstand'),
      true
    );

    engine.shutdown();

    const engine2 = new PlatformEngine({ enforceHandlerBudget: false });
    const altPack = {
      ...pack,
      ui_skin: 'child_warm_v2',
    };
    await engine2.initialize({
      manifest: altPack,
      progressionMaps: { routine_home: progression },
    });
    assert.equal(engine2.packLoader.getActive().ui_skin, 'child_warm_v2');
  });

  it('persists unlocks to child_progression_node (DB)', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    try {
      const fam = await db.query(
        `INSERT INTO family (name, timezone) VALUES ('Platform Engine Test', 'Europe/Stockholm') RETURNING id`
      );
      const child = await db.query(
        `INSERT INTO child (family_id, name, emoji, username, pin, sort_order)
         VALUES ($1, 'Testbarn', '⭐', 'pechild', 'hash', 0) RETURNING id`,
        [fam.rows[0].id]
      );
      const childId = child.rows[0].id;

      const store = new PgProgressionStore({ query: db.query });
      const insert = await store.unlock(childId, 'routine_home', 'routine_home_welcome_mat', {
        emotional_beat: 'test',
      });
      assert.equal(insert.inserted, true);

      const again = await store.unlock(childId, 'routine_home', 'routine_home_welcome_mat', {});
      assert.equal(again.inserted, false);

      const rows = await store.getUnlocked(childId, 'routine_home');
      assert.equal(rows.length, 1);
      assert.equal(rows[0].node_id, 'routine_home_welcome_mat');
    } finally {
      await db.cleanup();
    }
  });
});
