'use strict';

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const {
  seedCanonicalLibrary,
  createTestFamilyWithChild,
  getSubstepNames,
} = require('./helpers/canonical-library-fixture.js');
const { seedChildDefaultSchedule } = require('../src/lib/seed-child-default-schedule.js');
const { seedFamilyStarterActivitiesFromCanonicalDb } = require('../src/lib/standard-library-family-seed.js');
const { copyStandardScheduleToChild } = require('../src/lib/canonical-library-runtime.js');

describe('canonical library PR4 — consolidated creation flows', () => {
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

  test('seedChildDefaultSchedule copies canonical preschool schedule with provenance', async (t) => {
    if (!seeded) {
      t.skip('Canonical library not seeded');
      return;
    }
    const { familyId, childId } = await createTestFamilyWithChild(db);
    const result = await seedChildDefaultSchedule({
      childId,
      familyId,
      birthday: '2019-01-01',
    });
    assert.equal(result.seeded, true);

    const templates = await db.query(
      `SELECT source_canonical_id FROM activity_template
       WHERE family_id = $1 AND source_canonical_id IS NOT NULL`,
      [familyId]
    );
    assert.ok(templates.rows.length > 0);

    const brush = await db.query(
      `SELECT id FROM activity_template
       WHERE family_id = $1 AND source_canonical_id = 'brush_teeth' LIMIT 1`,
      [familyId]
    );
    assert.ok(brush.rows[0]);
    const subNames = await getSubstepNames(db, brush.rows[0].id);
    const brushStep = await db.query(
      `SELECT duration_seconds FROM activity_sub_step
       WHERE activity_template_id = $1 AND name = 'Borsta tänderna' LIMIT 1`,
      [brush.rows[0].id]
    );
    assert.equal(brushStep.rows[0]?.duration_seconds, 120);
    assert.equal(subNames.length, 5);
  });

  test('seedChildDefaultSchedule resolves school_weekday with after_school_home default', async (t) => {
    if (!seeded) {
      t.skip('Canonical library not seeded');
      return;
    }

    const { familyId, childId } = await createTestFamilyWithChild(db);
    const result = await seedChildDefaultSchedule({
      childId,
      familyId,
      birthday: '2015-01-01',
    });
    assert.equal(result.seeded, true);
    assert.equal(result.defaultScheduleName, 'Skola vardag');

    const afterSchool = await db.query(
      `SELECT at.source_canonical_id, at.name
       FROM weekly_schedule_item wsi
       JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
       JOIN activity_template at ON at.id = wsi.activity_template_id
       WHERE ws.child_id = $1 AND at.source_canonical_id = 'after_school'
       LIMIT 1`,
      [childId]
    );
    assert.ok(afterSchool.rows[0]);
    assert.match(afterSchool.rows[0].name, /hem/i);
  });

  test('seedFamilyStarterActivitiesFromCanonicalDb uses canonical identity not display names', async (t) => {
    if (!seeded) {
      t.skip('Canonical library not seeded');
      return;
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const familyRes = await client.query(
        `INSERT INTO family (name, timezone, preferred_locale)
         VALUES ('Register seed QA', 'Europe/Stockholm', 'sv-SE') RETURNING id`
      );
      const familyId = familyRes.rows[0].id;
      const categoryMap = {};
      for (const [key, name, sort] of [
        ['forskola', 'Förskola', 0],
        ['morgon', 'Morgon', 2],
        ['dag', 'Dag', 3],
        ['kvall', 'Kväll', 4],
      ]) {
        const cat = await client.query(
          'INSERT INTO category (family_id, name, sort_order, is_default) VALUES ($1, $2, $3, true) RETURNING id',
          [familyId, name, sort]
        );
        categoryMap[key] = cat.rows[0].id;
      }
      const copied = await seedFamilyStarterActivitiesFromCanonicalDb(client, familyId, categoryMap, 'sv-SE');
      assert.ok(copied > 0);
      const wake = await client.query(
        `SELECT source_canonical_id, source_default_activity_id
         FROM activity_template WHERE family_id = $1 AND source_canonical_id = 'wake_up'`,
        [familyId]
      );
      assert.equal(wake.rows.length, 1);
      assert.ok(wake.rows[0].source_default_activity_id);
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  test('copyStandardScheduleToChild snapshot stays independent when canonical master mutates', async (t) => {
    if (!seeded) {
      t.skip('Canonical library not seeded');
      return;
    }

    const { familyId, childId } = await createTestFamilyWithChild(db);
    const tx = await db.pool.connect();
    try {
      await tx.query('BEGIN');
      await copyStandardScheduleToChild(tx, {
        familyId,
        childId,
        days: [1],
        overwrite: true,
        locale: 'sv-SE',
        templateGroup: 'forskola',
        externalTransaction: true,
      });
      await tx.query('COMMIT');
    } finally {
      tx.release();
    }

    const before = await db.query(
      `SELECT at.name, at.star_value, wsi.start_time
       FROM weekly_schedule_item wsi
       JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
       JOIN activity_template at ON at.id = wsi.activity_template_id
       WHERE ws.child_id = $1`,
      [childId]
    );

    await db.query(
      `UPDATE default_activity_template SET name = 'Mutated wake', star_value = 9 WHERE canonical_id = 'wake_up'`
    );

    const after = await db.query(
      `SELECT at.name, at.star_value, wsi.start_time
       FROM weekly_schedule_item wsi
       JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
       JOIN activity_template at ON at.id = wsi.activity_template_id
       WHERE ws.child_id = $1`,
      [childId]
    );
    assert.deepEqual(after.rows, before.rows);
  });

  test('wash_hands wash substep keeps duration_seconds = 20 in registration seed path', async (t) => {
    if (!seeded) {
      t.skip('Canonical library not seeded');
      return;
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const familyRes = await client.query(
        `INSERT INTO family (name, timezone, preferred_locale)
         VALUES ('Wash seed QA', 'Europe/Stockholm', 'sv-SE') RETURNING id`
      );
      const familyId = familyRes.rows[0].id;
      const categoryMap = { forskola: (await client.query(
        'INSERT INTO category (family_id, name, sort_order, is_default) VALUES ($1, $2, 0, true) RETURNING id',
        [familyId, 'Förskola']
      )).rows[0].id };
      await seedFamilyStarterActivitiesFromCanonicalDb(client, familyId, categoryMap, 'sv-SE');
      await client.query('COMMIT');

      const washTpl = await db.query(
        `SELECT id FROM activity_template
         WHERE family_id = $1 AND source_canonical_id = 'wash_hands' LIMIT 1`,
        [familyId]
      );
      assert.ok(washTpl.rows[0]);
      const washStep = await db.query(
        `SELECT duration_seconds FROM activity_sub_step
         WHERE activity_template_id = $1 AND name = 'Tvätta händerna' LIMIT 1`,
        [washTpl.rows[0].id]
      );
      assert.equal(washStep.rows[0]?.duration_seconds, 20);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  });

  test('cleanup', async (t) => {
    if (!db || db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    await db.cleanup();
  });
});
