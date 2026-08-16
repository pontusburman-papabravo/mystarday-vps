'use strict';

/**
 * Activity Timer V2 × Standard Library v1.1 cross-contract (integration).
 * Traces manifest → canonical DB → family copy → timer-relevant durations.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { setupTestDb } = require('./helpers/setup.js');
const {
  seedCanonicalLibrary,
  createTestFamilyWithChild,
  findDefaultActivityByCanonical,
} = require('./helpers/canonical-library-fixture.js');
const { copyCanonicalScheduleToFamily } = require('../src/lib/canonical-library-copy');
const { readManifestFile, DEFAULT_MANIFEST_PATH } = require('../src/lib/standard-library-manifest');

const NO_TIMER_CANONICAL_IDS = [
  'bedtime_reading',
  'homework',
  'free_time',
  'calm_time',
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'sleep',
  'family_activity',
];

function loadSession() {
  const store = new Map();
  const window = {
    localStorage: {
      getItem(key) { return store.has(key) ? store.get(key) : null; },
      setItem(key, value) { store.set(key, value); },
      removeItem(key) { store.delete(key); },
      get length() { return store.size; },
      key(i) { return [...store.keys()][i] ?? null; },
    },
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, '../public/js/activity-timer-session.js'), 'utf8'),
    { window, localStorage: window.localStorage, console }
  );
  return { ATS: window.ActivityTimerSession, store };
}

describe('Activity Timer × Standard Library cross-contract', () => {
  let db;
  let seeded = false;

  test('setup canonical library fixture', async (t) => {
    db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    await db.truncate();
    const client = await db.pool.connect();
    try {
      await seedCanonicalLibrary(client);
      seeded = true;
    } finally {
      client.release();
    }
  });

  test('manifest → canonical DB: brush_teeth.brush=120, wash_hands.wash=20', async (t) => {
    if (!seeded) {
      t.skip('Canonical library not seeded');
      return;
    }
    const manifest = readManifestFile(DEFAULT_MANIFEST_PATH);
    const brushManifest = manifest.activities.find((a) => a.activity_id === 'brush_teeth');
    const washManifest = manifest.activities.find((a) => a.activity_id === 'wash_hands');
    assert.equal(
      brushManifest.sub_steps.find((s) => s.step_id === 'brush_teeth.brush').duration_seconds,
      120
    );
    assert.equal(
      washManifest.sub_steps.find((s) => s.step_id === 'wash_hands.wash').duration_seconds,
      20
    );

    const brushDb = await findDefaultActivityByCanonical(db, 'brush_teeth');
    const washDb = await findDefaultActivityByCanonical(db, 'wash_hands');
    const brushStep = brushDb.sub_steps.find((s) => s.step_id?.includes('.brush'));
    const washStep = washDb.sub_steps.find((s) => s.step_id?.includes('.wash'));
    assert.equal(brushStep.duration_seconds, 120);
    assert.equal(washStep.duration_seconds, 20);
  });

  test('canonical copy → family template preserves timed substeps', async (t) => {
    if (!seeded) {
      t.skip('Canonical library not seeded');
      return;
    }
    const client = await db.pool.connect();
    try {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      await copyCanonicalScheduleToFamily(client, {
        familyId,
        childId,
        canonicalScheduleId: 'morning_routine',
        days: [1],
        locale: 'sv-SE',
      });

      const brushFamily = await db.query(
        `SELECT id FROM activity_template
         WHERE family_id = $1 AND source_canonical_id = 'brush_teeth' LIMIT 1`,
        [familyId]
      );
      assert.ok(brushFamily.rows[0]);
      const brushSub = await db.query(
        `SELECT duration_seconds FROM activity_sub_step
         WHERE activity_template_id = $1 AND duration_seconds IS NOT NULL`,
        [brushFamily.rows[0].id]
      );
      assert.equal(brushSub.rows[0].duration_seconds, 120);
    } finally {
      client.release();
    }
  });

  test('no unintended timers on frozen no-timer canonical activities', async (t) => {
    if (!seeded) {
      t.skip('Canonical library not seeded');
      return;
    }
    for (const canonicalId of NO_TIMER_CANONICAL_IDS) {
      const act = await findDefaultActivityByCanonical(db, canonicalId);
      assert.ok(act, canonicalId);
      const subSteps = typeof act.sub_steps === 'string'
        ? JSON.parse(act.sub_steps)
        : (act.sub_steps || []);
      const timed = subSteps.filter((s) => s.duration_seconds != null);
      assert.equal(timed.length, 0, `${canonicalId} must have no timed substeps`);
    }
  });

  test('family snapshot timer data survives canonical master mutation', async (t) => {
    if (!seeded) {
      t.skip('Canonical library not seeded');
      return;
    }
    const client = await db.pool.connect();
    try {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      await copyCanonicalScheduleToFamily(client, {
        familyId,
        childId,
        canonicalScheduleId: 'morning_routine',
        days: [1],
        locale: 'sv-SE',
      });

      const before = await db.query(
        `SELECT ass.duration_seconds FROM activity_sub_step ass
         JOIN activity_template at ON at.id = ass.activity_template_id
         WHERE at.family_id = $1 AND at.source_canonical_id = 'brush_teeth'
           AND ass.duration_seconds IS NOT NULL`,
        [familyId]
      );
      assert.equal(before.rows[0].duration_seconds, 120);

      await db.query(
        `UPDATE default_activity_template SET sub_steps = '[]'::jsonb
         WHERE canonical_id = 'brush_teeth'`
      );

      const after = await db.query(
        `SELECT ass.duration_seconds FROM activity_sub_step ass
         JOIN activity_template at ON at.id = ass.activity_template_id
         WHERE at.family_id = $1 AND at.source_canonical_id = 'brush_teeth'
           AND ass.duration_seconds IS NOT NULL`,
        [familyId]
      );
      assert.deepEqual(after.rows, before.rows);
    } finally {
      client.release();
    }
  });

  test('session identity uses daily_log_item_id — same activity twice independent', () => {
    const { ATS } = loadSession();
    ATS.startSession('c1', '2026-08-04', 'log-item-a', 120);
    ATS.startSession('c1', '2026-08-04', 'log-item-b', 120);
    assert.equal(ATS.resolveStatus(ATS.getSession('c1', '2026-08-04', 'log-item-a'), 120), 'running');
    assert.equal(ATS.resolveStatus(ATS.getSession('c1', '2026-08-04', 'log-item-b'), 120), 'running');
    ATS.pauseSession('c1', '2026-08-04', 'log-item-a', 120);
    assert.equal(ATS.resolveStatus(ATS.getSession('c1', '2026-08-04', 'log-item-a'), 120), 'paused');
    assert.equal(ATS.resolveStatus(ATS.getSession('c1', '2026-08-04', 'log-item-b'), 120), 'running');
  });
});
