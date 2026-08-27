'use strict';

/**
 * Phase 1A — canonical schedule-apply command service (src/lib/schedule-apply.js).
 *
 * NOTE on require order: src/lib/schedule-apply.js uses the src/lib/db.js singleton pool
 * (it manages its own transactions, unlike canonical-library-copy.js which takes an external
 * client). db.js binds to process.env.DATABASE_URL at require time, so schedule-apply.js
 * (and any module that transitively requires it) MUST be required lazily, AFTER
 * setupTestDb() has pointed DATABASE_URL at the disposable test database — never at module
 * top level. See test/schedules-revoked-parent.integration.test.js for the same pattern.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const {
  seedCanonicalLibrary,
  createTestFamilyWithChild,
  createSecondChildInFamily,
  countFamilyWrites,
} = require('./helpers/canonical-library-fixture.js');

async function seedFamilyTemplate(db, familyId, items) {
  const tpl = await db.query(
    `INSERT INTO weekly_schedule (family_id, name, sort_order, day_of_week, child_id)
     VALUES ($1, 'Mall', 0, 0, NULL) RETURNING id`,
    [familyId]
  );
  const templateId = tpl.rows[0].id;
  for (const item of items) {
    await db.query(
      `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, start_time, end_time, sort_order, section)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [templateId, item.activityId, item.startTime || null, item.endTime || null, item.sortOrder || 0, item.section || 'morgon']
    );
  }
  return templateId;
}

async function seedActivity(db, familyId, name) {
  const res = await db.query(
    `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order)
     VALUES ($1, $2, '⭐', 1, 0) RETURNING id`,
    [familyId, name]
  );
  return res.rows[0].id;
}

async function weeklyItemRows(db, childId, dayOfWeek) {
  const res = await db.query(
    `SELECT wsi.activity_template_id, wsi.section, wsi.start_time, wsi.end_time
     FROM weekly_schedule_item wsi
     JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
     WHERE ws.child_id = $1 AND ws.day_of_week = $2
     ORDER BY wsi.sort_order ASC`,
    [childId, dayOfWeek]
  );
  return res.rows;
}

test('schedule-apply canonical command service', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  // Lazy require — see file header note.
  const {
    applyScheduleSourceToChild,
    applyScheduleSourceToTargets,
    applyScheduleItemsToDay,
    ScheduleApplyError,
    normalizeDays,
  } = require('../src/lib/schedule-apply');

  try {
    await t.test('normalizeDays validates + de-dupes + sorts', () => {
      assert.deepEqual(normalizeDays([3, 1, 1, 5]), [1, 3, 5]);
      assert.throws(() => normalizeDays([7]), ScheduleApplyError);
      assert.throws(() => normalizeDays([]), ScheduleApplyError);
      assert.throws(() => normalizeDays(['x']), ScheduleApplyError);
    });

    await t.test('merge into empty day adds items (§5.1)', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Tänder');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId, section: 'morgon' }]);

      const result = await applyScheduleSourceToChild({
        familyId, childId, sourceType: 'family_template', sourceId: templateId, days: [1], mode: 'merge',
      });

      assert.deepEqual(result.applied_days, [1]);
      assert.equal(result.duplicate_items_skipped, 0);
      const rows = await weeklyItemRows(db, childId, 1);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].activity_template_id, activityId);
    });

    await t.test('merge into populated day preserves existing items (§5.1, §6 example)', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const existingActivity = await seedActivity(db, familyId, 'Tvätta ansikte');
      await seedFamilyTemplate(db, familyId, [{ activityId: existingActivity, section: 'morgon' }])
        .then((tplId) => applyScheduleSourceToChild({
          familyId, childId, sourceType: 'family_template', sourceId: tplId, days: [2], mode: 'merge',
        }));

      const newActivity = await seedActivity(db, familyId, 'Läxor');
      const eveningTplId = await seedFamilyTemplate(db, familyId, [{ activityId: newActivity, section: 'kvall' }]);
      await applyScheduleSourceToChild({
        familyId, childId, sourceType: 'family_template', sourceId: eveningTplId, days: [2], mode: 'merge',
      });

      const rows = await weeklyItemRows(db, childId, 2);
      const ids = rows.map((r) => r.activity_template_id).sort();
      assert.deepEqual(ids, [existingActivity, newActivity].sort());
    });

    await t.test('merge is duplicate-safe on retry — no duplicate rows (§5.2, §7)', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Tänder');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId, section: 'morgon' }]);

      const first = await applyScheduleSourceToChild({
        familyId, childId, sourceType: 'family_template', sourceId: templateId, days: [1], mode: 'merge',
      });
      const second = await applyScheduleSourceToChild({
        familyId, childId, sourceType: 'family_template', sourceId: templateId, days: [1], mode: 'merge',
      });

      assert.equal(first.duplicate_items_skipped, 0);
      assert.equal(second.duplicate_items_skipped, 1);
      const rows = await weeklyItemRows(db, childId, 1);
      assert.equal(rows.length, 1, 'exact duplicate (same template+section+time) must not be re-inserted');
    });

    await t.test('same activity twice in one section at different times is allowed, not deduped (§5.2)', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Läsning');
      const templateId = await seedFamilyTemplate(db, familyId, [
        { activityId, section: 'kvall', startTime: '18:00', endTime: '18:15' },
        { activityId, section: 'kvall', startTime: '19:00', endTime: '19:15' },
      ]);

      await applyScheduleSourceToChild({
        familyId, childId, sourceType: 'family_template', sourceId: templateId, days: [3], mode: 'merge',
      });

      const rows = await weeklyItemRows(db, childId, 3);
      assert.equal(rows.length, 2, 'distinct start/end times are a distinct identity, not a duplicate');
    });

    await t.test('idempotent replay with same operation_id returns cached result, no re-mutation (§7)', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Tänder');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId, section: 'morgon' }]);
      const operationId = `test-op-${Date.now()}`;

      const first = await applyScheduleSourceToChild({
        familyId, childId, sourceType: 'family_template', sourceId: templateId, days: [4], mode: 'replace_day', operationId,
      });
      assert.equal(first.replayed, false);

      const replay = await applyScheduleSourceToChild({
        familyId, childId, sourceType: 'family_template', sourceId: templateId, days: [4], mode: 'replace_day', operationId,
      });
      assert.equal(replay.replayed, true);

      const rows = await weeklyItemRows(db, childId, 4);
      assert.equal(rows.length, 1, 'replayed replace_day must not duplicate rows or wipe+reapply');
    });

    await t.test('replace_sections only replaces source-covered sections (§5.3)', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const breakfast = await seedActivity(db, familyId, 'Frukost');
      const doctor = await seedActivity(db, familyId, 'Läkare');
      const oldEvening = await seedActivity(db, familyId, 'Gammal kvällsrutin');
      const baseTplId = await seedFamilyTemplate(db, familyId, [
        { activityId: breakfast, section: 'morgon' },
        { activityId: doctor, section: 'dag' },
        { activityId: oldEvening, section: 'kvall' },
      ]);
      await applyScheduleSourceToChild({
        familyId, childId, sourceType: 'family_template', sourceId: baseTplId, days: [2], mode: 'merge',
      });

      const brushTeeth = await seedActivity(db, familyId, 'Borsta tänderna');
      const pyjamas = await seedActivity(db, familyId, 'Pyjamas');
      const eveningTplId = await seedFamilyTemplate(db, familyId, [
        { activityId: brushTeeth, section: 'kvall' },
        { activityId: pyjamas, section: 'kvall' },
      ]);
      await applyScheduleSourceToChild({
        familyId, childId, sourceType: 'family_template', sourceId: eveningTplId, days: [2], mode: 'replace_sections',
      });

      const rows = await weeklyItemRows(db, childId, 2);
      const morgon = rows.filter((r) => r.section === 'morgon').map((r) => r.activity_template_id);
      const dag = rows.filter((r) => r.section === 'dag').map((r) => r.activity_template_id);
      const kvall = rows.filter((r) => r.section === 'kvall').map((r) => r.activity_template_id).sort();
      assert.deepEqual(morgon, [breakfast], 'morgon untouched');
      assert.deepEqual(dag, [doctor], 'dag untouched');
      assert.deepEqual(kvall, [brushTeeth, pyjamas].sort(), 'kvall fully replaced');
    });

    await t.test('replace_day replaces every section and is never the implicit default (§5.4)', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const morningActivity = await seedActivity(db, familyId, 'Frukost');
      const eveningActivity = await seedActivity(db, familyId, 'Saga');
      const baseTplId = await seedFamilyTemplate(db, familyId, [
        { activityId: morningActivity, section: 'morgon' },
        { activityId: eveningActivity, section: 'kvall' },
      ]);
      await applyScheduleSourceToChild({
        familyId, childId, sourceType: 'family_template', sourceId: baseTplId, days: [5], mode: 'merge',
      });

      const onlyMorning = await seedActivity(db, familyId, 'Ny frukost');
      const replaceTplId = await seedFamilyTemplate(db, familyId, [{ activityId: onlyMorning, section: 'morgon' }]);
      await applyScheduleSourceToChild({
        familyId, childId, sourceType: 'family_template', sourceId: replaceTplId, days: [5], mode: 'replace_day',
      });

      const rows = await weeklyItemRows(db, childId, 5);
      assert.deepEqual(rows.map((r) => r.activity_template_id), [onlyMorning], 'evening activity from before must be gone — full day replaced');
    });

    await t.test('empty source cannot silently wipe a day and never mutates (§5.5)', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Frukost');
      const populatedTplId = await seedFamilyTemplate(db, familyId, [{ activityId, section: 'morgon' }]);
      await applyScheduleSourceToChild({
        familyId, childId, sourceType: 'family_template', sourceId: populatedTplId, days: [6], mode: 'merge',
      });

      const emptyTplId = await seedFamilyTemplate(db, familyId, []);
      await assert.rejects(
        applyScheduleSourceToChild({
          familyId, childId, sourceType: 'family_template', sourceId: emptyTplId, days: [6], mode: 'replace_day',
        }),
        ScheduleApplyError
      );

      const rows = await weeklyItemRows(db, childId, 6);
      assert.equal(rows.length, 1, 'day must be untouched after a rejected empty-source apply');
    });

    await t.test('multi-day apply is atomic — invalid day rolls back nothing written for valid days (§5.6, §23)', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Frukost');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId, section: 'morgon' }]);

      // Force a DB-level failure (FK violation on a bogus custody_home_id) inside the
      // per-day write loop to exercise the single BEGIN/COMMIT transaction boundary.
      await assert.rejects(
        applyScheduleSourceToChild({
          familyId, childId, sourceType: 'family_template', sourceId: templateId, days: [1, 2], mode: 'merge',
          custodyContext: { custodyHomeId: '00000000-0000-0000-0000-000000000000' },
        })
      );

      const day1 = await weeklyItemRows(db, childId, 1);
      const day2 = await weeklyItemRows(db, childId, 2);
      assert.equal(day1.length, 0, 'day 1 must roll back when day 2 fails in the same command');
      assert.equal(day2.length, 0);
    });

    await t.test('family_template from another family is denied (§22)', async () => {
      const { familyId: familyA } = await createTestFamilyWithChild(db);
      const { familyId: familyB, childId: childB } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyA, 'Frukost');
      const templateId = await seedFamilyTemplate(db, familyA, [{ activityId, section: 'morgon' }]);

      await assert.rejects(
        applyScheduleSourceToChild({
          familyId: familyB, childId: childB, sourceType: 'family_template', sourceId: templateId, days: [1], mode: 'merge',
        }),
        (err) => {
          assert.ok(err instanceof ScheduleApplyError);
          assert.equal(err.httpStatus, 404);
          return true;
        }
      );
    });

    await t.test('applyScheduleItemsToDay: canonical section order/day-mutation primitive', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Frukost');
      const client = await db.pool.connect();
      try {
        const result = await applyScheduleItemsToDay(client, {
          childId, dayOfWeek: 1, mode: 'merge',
          items: [{ activity_template_id: activityId, section: 'morgon', sort_order: 0 }],
        });
        assert.equal(result.action, 'merge');
        assert.equal(result.itemsAdded, 1);
      } finally {
        client.release();
      }
    });

    await t.test('standard_schedule apply materializes activities once, not per-day (§10)', async () => {
      const client = await db.pool.connect();
      let scheduleId;
      try {
        await seedCanonicalLibrary(client);
        const scheduleRes = await client.query(
          `SELECT id FROM default_schedule WHERE canonical_id = 'morning_routine' LIMIT 1`
        );
        scheduleId = scheduleRes.rows[0].id;
      } finally {
        client.release();
      }
      const { familyId, childId } = await createTestFamilyWithChild(db);

      const before = await countFamilyWrites(db, familyId);
      const result = await applyScheduleSourceToChild({
        familyId, childId, sourceType: 'standard_schedule', sourceId: scheduleId, days: [1, 2, 3], mode: 'merge',
      });
      const after = await countFamilyWrites(db, familyId);

      assert.deepEqual(result.applied_days, [1, 2, 3]);
      assert.equal(result.source.source_type, 'standard_schedule');
      assert.ok(result.source.activities_created > 0);
      // Same materialized activity_template rows reused across all 3 days — not tripled.
      assert.equal(after.activityTemplates, before.activityTemplates + result.source.activities_created);
      assert.equal(after.weeklyScheduleItems, before.weeklyScheduleItems + result.source.activities_created * 3);

      // Re-applying (retry / second day set) must not create new activity_template rows.
      const second = await applyScheduleSourceToChild({
        familyId, childId, sourceType: 'standard_schedule', sourceId: scheduleId, days: [4], mode: 'merge',
      });
      assert.equal(second.source.activities_created, 0, 'materialization must be reused, not duplicated');
      const finalCount = await countFamilyWrites(db, familyId);
      assert.equal(finalCount.activityTemplates, after.activityTemplates);
    });

    await t.test('batch orchestrator: one unauthorized child blocks the whole batch (§6)', async () => {
      const { familyId, childId: childA } = await createTestFamilyWithChild(db);
      const childB = await createSecondChildInFamily(db, familyId);
      const { childId: foreignChild } = await createTestFamilyWithChild(db); // different family
      const activityId = await seedActivity(db, familyId, 'Frukost');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId, section: 'morgon' }]);

      async function authorizeChild(childId) {
        const res = await db.query('SELECT id, family_id FROM child WHERE id = $1', [childId]);
        return res.rows[0] || null;
      }

      await assert.rejects(
        applyScheduleSourceToTargets({
          targets: [{ childId: childA, days: [1] }, { childId: foreignChild, days: [1] }],
          authorizeChild, familyId, sourceType: 'family_template', sourceId: templateId, mode: 'merge',
        }),
        (err) => {
          assert.ok(err instanceof ScheduleApplyError);
          assert.equal(err.httpStatus, 403);
          return true;
        }
      );

      assert.equal((await weeklyItemRows(db, childA, 1)).length, 0, 'authorized child must NOT be mutated when another target fails preflight');

      const ok = await applyScheduleSourceToTargets({
        targets: [{ childId: childA, days: [1] }, { childId: childB, days: [1] }],
        authorizeChild, familyId, sourceType: 'family_template', sourceId: templateId, mode: 'merge',
      });
      assert.equal(ok.targets.length, 2);
      assert.equal((await weeklyItemRows(db, childA, 1)).length, 1);
      assert.equal((await weeklyItemRows(db, childB, 1)).length, 1);
    });
  } finally {
    await db.cleanup();
  }
});
