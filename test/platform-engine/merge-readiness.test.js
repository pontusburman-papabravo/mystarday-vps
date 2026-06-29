'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { EventBus } = require('../../src/platform-engine/event-bus');
const { PlatformEngine } = require('../../src/platform-engine');
const { RewardRuntime } = require('../../src/platform-engine/reward');
const { setupTestDb } = require('../helpers/setup.js');

const pack = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/child-se-pack.json'), 'utf8'));
const progression = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/routine-home-progression.json'), 'utf8'));

const CHILD_ID = '00000000-0000-4000-8000-000000000020';

describe('Merge readiness — Event Bus edge cases', () => {
  it('delivers handler-emitted events in the same flush (nested emit, not re-entrant flush)', () => {
    const bus = new EventBus();
    const order = [];
    bus.subscribe('onMilestone', 'chain:a', () => {
      order.push('a');
      bus.emit('onStarGranted', { child_id: 'c1', amount: 1 });
    });
    bus.subscribe('onStarGranted', 'chain:b', () => {
      order.push('b');
    });
    bus.emit('onMilestone', { child_id: 'c1', milestone_type: 'sprout' });
    bus.flush();
    assert.deepEqual(order, ['a', 'b']);
  });

  it('throws when delivery cap exceeded (emit storm)', () => {
    const bus = new EventBus();
    bus.subscribe('onMilestone', 'storm', () => {
      bus.emit('onMilestone', { child_id: 'c1', milestone_type: 'loop' });
    });
    bus.emit('onMilestone', { child_id: 'c1', milestone_type: 'start' });
    assert.throws(() => bus.flush(), /delivery budget exceeded/);
  });
});

describe('Merge readiness — Progression replay & compound', () => {
  it('duplicate milestone replay is idempotent (offline-like)', async () => {
    const engine = new PlatformEngine({ enforceHandlerBudget: false });
    await engine.initialize({
      manifest: pack,
      progressionMaps: { routine_home: progression },
    });
    engine.start();

    const unlocks = [];
    engine.subscribe('onProgressionNodeUnlocked', 'replay:cap', (p) => {
      unlocks.push(p.node_id);
    });

    const payload = { child_id: CHILD_ID, milestone_type: 'sprout' };
    engine.emit('onMilestone', payload);
    engine.emit('onMilestone', payload);
    engine.emit('onMilestone', payload);

    assert.deepEqual(unlocks, ['routine_home_nightstand']);
  });

  it('compound unlock completes across separate emit cycles', async () => {
    const engine = new PlatformEngine({ enforceHandlerBudget: false });
    await engine.initialize({
      manifest: pack,
      progressionMaps: { routine_home: progression },
    });
    engine.start();

    const unlocks = [];
    engine.subscribe('onProgressionNodeUnlocked', 'compound:cap', (p) => {
      unlocks.push(p.node_id);
    });

    engine.emit('onMilestone', { child_id: CHILD_ID, milestone_type: 'root' });
    assert.equal(unlocks.length, 0);

    engine.emit('onWorldEnter', { child_id: CHILD_ID, world_slug: 'routine_home' });
    assert.deepEqual(unlocks, ['routine_home_mira']);
  });
});

describe('Merge readiness — Reward boundary', () => {
  it('never emits reward.signal without pack config (no auto-grant)', () => {
    const bus = new EventBus();
    const signals = [];
    bus.subscribe('reward.signal', 'audit', (p) => signals.push(p));

    const reward = new RewardRuntime({ eventBus: bus });
    reward.attach(pack);

    bus.emit('onProgressionNodeUnlocked', {
      child_id: CHILD_ID,
      world_slug: 'routine_home',
      node_id: 'unconfigured_node',
    });
    bus.flush();

    assert.equal(signals.length, 0);
    assert.equal(reward.pendingSignals.length, 1);
    assert.equal(reward.pendingSignals[0].payload.reward_config, null);
  });
});

describe('Merge readiness — Migration 1808960000000', () => {
  it('child_progression_node exists with PK, index, and idempotent unlock', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    try {
      const table = await db.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'child_progression_node'
        ) AS exists
      `);
      assert.equal(table.rows[0].exists, true);

      const pk = await db.query(`
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = 'child_progression_node'::regclass AND i.indisprimary
        ORDER BY a.attnum
      `);
      assert.deepEqual(pk.rows.map((r) => r.attname), ['child_id', 'world_slug', 'node_id']);

      const indexes = await db.query(`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'child_progression_node'
      `);
      const indexNames = indexes.rows.map((r) => r.indexname);
      assert.ok(indexNames.some((n) => n.includes('child_world')));

      const fam = await db.query(
        `INSERT INTO family (name, timezone) VALUES ('Migration Test', 'Europe/Stockholm') RETURNING id`
      );
      const child = await db.query(
        `INSERT INTO child (family_id, name, emoji, username, pin, sort_order)
         VALUES ($1, 'M', '⭐', 'migchild', 'hash', 0) RETURNING id`,
        [fam.rows[0].id]
      );

      await db.query(
        `INSERT INTO child_progression_node (child_id, world_slug, node_id, metadata)
         VALUES ($1, 'routine_home', 'node_a', '{}'::jsonb)
         ON CONFLICT DO NOTHING`,
        [child.rows[0].id]
      );
      const dup = await db.query(
        `INSERT INTO child_progression_node (child_id, world_slug, node_id, metadata)
         VALUES ($1, 'routine_home', 'node_a', '{}'::jsonb)
         ON CONFLICT DO NOTHING RETURNING node_id`,
        [child.rows[0].id]
      );
      assert.equal(dup.rows.length, 0);
    } finally {
      await db.cleanup();
    }
  });

  it('migration file exposes down() for rollback', () => {
    const mod = require('../../migrations/1808960000000_child_progression_node.js');
    assert.equal(mod.name, '1808960000000_child_progression_node');
    assert.equal(typeof mod.up, 'function');
    assert.equal(typeof mod.down, 'function');
  });
});
