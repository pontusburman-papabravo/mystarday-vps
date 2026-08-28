'use strict';

/**
 * Phase 1B backend — direct-activity apply, copy-day, save-day-as-template
 * (src/lib/schedule-apply.js: applyActivityToChild, copyScheduleDay, saveWeeklyDayAsFamilyTemplate).
 *
 * Require-order note: same as test/schedule-apply.test.js — src/lib/schedule-apply.js uses the
 * src/lib/db.js singleton pool, so it must be required lazily, inside the test body, AFTER
 * setupTestDb() has pointed DATABASE_URL at the test database.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { createTestFamilyWithChild, createSecondChildInFamily } = require('./helpers/canonical-library-fixture.js');

async function seedActivity(db, familyId, name) {
  const res = await db.query(
    `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order)
     VALUES ($1, $2, '⭐', 1, 0) RETURNING id`,
    [familyId, name]
  );
  return res.rows[0].id;
}

async function seedWeeklyDay(db, childId, dayOfWeek, activityIds, section = 'morgon') {
  const sched = await db.query(
    `INSERT INTO weekly_schedule (child_id, day_of_week, sort_order) VALUES ($1, $2, $3) RETURNING id`,
    [childId, dayOfWeek, dayOfWeek]
  );
  let sortOrder = 0;
  for (const activityId of activityIds) {
    await db.query(
      `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section)
       VALUES ($1, $2, $3, $4)`,
      [sched.rows[0].id, activityId, sortOrder++, section]
    );
  }
  return sched.rows[0].id;
}

async function weeklyItemRows(db, childId, dayOfWeek) {
  const res = await db.query(
    `SELECT wsi.activity_template_id, wsi.section, wsi.start_time, wsi.end_time, wsi.sort_order
     FROM weekly_schedule_item wsi
     JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
     WHERE ws.child_id = $1 AND ws.day_of_week = $2
     ORDER BY wsi.sort_order ASC`,
    [childId, dayOfWeek]
  );
  return res.rows;
}

test('Phase 1B backend commands', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { applyActivityToChild, copyScheduleDay, saveWeeklyDayAsFamilyTemplate, ScheduleApplyError } =
    require('../src/lib/schedule-apply');

  try {
    // ── applyActivityToChild (direct activity source, §1B.1 / §1B.20) ─────────────

    await t.test('applyActivityToChild: one weekday, merge default', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Tänder');

      const result = await applyActivityToChild({
        familyId, childId, activityTemplateId: activityId, days: [1], section: 'morgon',
      });

      assert.deepEqual(result.applied_days, [1]);
      const rows = await weeklyItemRows(db, childId, 1);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].activity_template_id, activityId);
      assert.equal(rows[0].section, 'morgon');
    });

    await t.test('applyActivityToChild: several weekdays in one call', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Frukost');

      const result = await applyActivityToChild({
        familyId, childId, activityTemplateId: activityId, days: [1, 2, 3, 4, 5], section: 'morgon',
      });

      assert.deepEqual(result.applied_days, [1, 2, 3, 4, 5]);
      for (const dow of [1, 2, 3, 4, 5]) {
        assert.equal((await weeklyItemRows(db, childId, dow)).length, 1);
      }
    });

    await t.test('applyActivityToChild: default merge preserves existing items on the day', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const existing = await seedActivity(db, familyId, 'Befintlig');
      await seedWeeklyDay(db, childId, 2, [existing]);
      const newActivity = await seedActivity(db, familyId, 'Ny');

      await applyActivityToChild({ familyId, childId, activityTemplateId: newActivity, days: [2], section: 'kvall' });

      const rows = await weeklyItemRows(db, childId, 2);
      const ids = rows.map((r) => r.activity_template_id).sort();
      assert.deepEqual(ids, [existing, newActivity].sort());
    });

    await t.test('applyActivityToChild: duplicate-safe on retry, idempotent replay', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Tänder');
      const operationId = `activity-op-${Date.now()}`;

      const first = await applyActivityToChild({
        familyId, childId, activityTemplateId: activityId, days: [1], operationId,
      });
      assert.equal(first.replayed, false);
      const second = await applyActivityToChild({
        familyId, childId, activityTemplateId: activityId, days: [1], operationId,
      });
      assert.equal(second.replayed, true);
      assert.equal((await weeklyItemRows(db, childId, 1)).length, 1);
    });

    await t.test('applyActivityToChild: activity from another family is denied, no mutation', async () => {
      const { familyId: familyA } = await createTestFamilyWithChild(db);
      const { familyId: familyB, childId: childB } = await createTestFamilyWithChild(db);
      const activityA = await seedActivity(db, familyA, 'Frukost A');

      await assert.rejects(
        applyActivityToChild({ familyId: familyB, childId: childB, activityTemplateId: activityA, days: [1] }),
        (err) => { assert.ok(err instanceof ScheduleApplyError); assert.equal(err.httpStatus, 404); return true; }
      );
      assert.equal((await weeklyItemRows(db, childB, 1)).length, 0);
    });

    await t.test('applyActivityToChild: cross-family child denied even with same-family activity', async () => {
      const { familyId: familyA } = await createTestFamilyWithChild(db);
      const activityA = await seedActivity(db, familyA, 'Frukost A');
      const { childId: childB } = await createTestFamilyWithChild(db);

      await assert.rejects(
        applyActivityToChild({ familyId: familyA, childId: childB, activityTemplateId: activityA, days: [1] }),
        (err) => { assert.ok(err instanceof ScheduleApplyError); assert.equal(err.code, 'CHILD_NOT_IN_FAMILY'); return true; }
      );
    });

    // ── copyScheduleDay (§1B.4 / §1B.21) ──────────────────────────────────────────

    await t.test('copy day: source day -> empty target day merges in', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const a = await seedActivity(db, familyId, 'A');
      const b = await seedActivity(db, familyId, 'B');
      await seedWeeklyDay(db, childId, 1, [a, b]);

      const result = await copyScheduleDay({
        familyId, sourceChildId: childId, sourceDayOfWeek: 1, targetChildId: childId, targetDays: [3],
      });

      assert.deepEqual(result.applied_days, [3]);
      const rows = await weeklyItemRows(db, childId, 3);
      assert.deepEqual(rows.map((r) => r.activity_template_id).sort(), [a, b].sort());
    });

    await t.test('copy day: populated target preserves existing items by default (merge)', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const a = await seedActivity(db, familyId, 'A');
      const existing = await seedActivity(db, familyId, 'Existing');
      await seedWeeklyDay(db, childId, 1, [a]);
      await seedWeeklyDay(db, childId, 4, [existing]);

      await copyScheduleDay({ familyId, sourceChildId: childId, sourceDayOfWeek: 1, targetChildId: childId, targetDays: [4] });

      const rows = await weeklyItemRows(db, childId, 4);
      assert.deepEqual(rows.map((r) => r.activity_template_id).sort(), [a, existing].sort());
    });

    await t.test('copy day: explicit replace_day replaces the whole target day', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const a = await seedActivity(db, familyId, 'A');
      const oldOnly = await seedActivity(db, familyId, 'OldOnly');
      await seedWeeklyDay(db, childId, 1, [a]);
      await seedWeeklyDay(db, childId, 5, [oldOnly]);

      await copyScheduleDay({
        familyId, sourceChildId: childId, sourceDayOfWeek: 1, targetChildId: childId, targetDays: [5], mode: 'replace_day',
      });

      const rows = await weeklyItemRows(db, childId, 5);
      assert.deepEqual(rows.map((r) => r.activity_template_id), [a]);
    });

    await t.test('copy day: source day itself is never modified', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const a = await seedActivity(db, familyId, 'A');
      await seedWeeklyDay(db, childId, 1, [a]);
      const before = await weeklyItemRows(db, childId, 1);

      await copyScheduleDay({
        familyId, sourceChildId: childId, sourceDayOfWeek: 1, targetChildId: childId, targetDays: [2, 3], mode: 'replace_day',
      });

      const after = await weeklyItemRows(db, childId, 1);
      assert.deepEqual(after, before);
    });

    await t.test('copy day: empty source day cannot wipe target, no mutation', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const existing = await seedActivity(db, familyId, 'Existing');
      await seedWeeklyDay(db, childId, 6, [existing]);
      // day 1 (source) is intentionally empty — no weekly_schedule row at all

      await assert.rejects(
        copyScheduleDay({
          familyId, sourceChildId: childId, sourceDayOfWeek: 1, targetChildId: childId, targetDays: [6], mode: 'replace_day',
        }),
        ScheduleApplyError
      );
      const rows = await weeklyItemRows(db, childId, 6);
      assert.deepEqual(rows.map((r) => r.activity_template_id), [existing], 'target day 6 must be untouched');
    });

    await t.test('copy day: copies to a different child in the same family', async () => {
      const { familyId, childId: childA } = await createTestFamilyWithChild(db);
      const childB = await createSecondChildInFamily(db, familyId);
      const a = await seedActivity(db, familyId, 'A');
      await seedWeeklyDay(db, childA, 1, [a]);

      const result = await copyScheduleDay({
        familyId, sourceChildId: childA, sourceDayOfWeek: 1, targetChildId: childB, targetDays: [1],
      });

      assert.equal(result.child_id, childB);
      assert.deepEqual((await weeklyItemRows(db, childB, 1)).map((r) => r.activity_template_id), [a]);
    });

    await t.test('copy day: cross-family source child denied, no mutation', async () => {
      const { familyId: familyA, childId: childA } = await createTestFamilyWithChild(db);
      const { familyId: familyB, childId: childB } = await createTestFamilyWithChild(db);
      const a = await seedActivity(db, familyA, 'A');
      await seedWeeklyDay(db, childA, 1, [a]);

      await assert.rejects(
        copyScheduleDay({
          familyId: familyB, sourceChildId: childA, sourceDayOfWeek: 1, targetChildId: childB, targetDays: [1],
        }),
        (err) => { assert.ok(err instanceof ScheduleApplyError); assert.equal(err.code, 'CHILD_NOT_IN_FAMILY'); return true; }
      );
      assert.equal((await weeklyItemRows(db, childB, 1)).length, 0);
    });

    await t.test('copy day: cross-family target child denied, no mutation', async () => {
      const { familyId: familyA, childId: childA } = await createTestFamilyWithChild(db);
      const { childId: childB } = await createTestFamilyWithChild(db); // family B
      const a = await seedActivity(db, familyA, 'A');
      await seedWeeklyDay(db, childA, 1, [a]);

      await assert.rejects(
        copyScheduleDay({
          familyId: familyA, sourceChildId: childA, sourceDayOfWeek: 1, targetChildId: childB, targetDays: [1],
        }),
        (err) => { assert.ok(err instanceof ScheduleApplyError); assert.equal(err.code, 'CHILD_NOT_IN_FAMILY'); return true; }
      );
    });

    // ── saveWeeklyDayAsFamilyTemplate (§1B.5 / §1B.22) ────────────────────────────

    await t.test('save day as template: day saved with all items, section/time/order preserved', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const a = await seedActivity(db, familyId, 'Frukost');
      const b = await seedActivity(db, familyId, 'Borsta tänderna');
      const sched = await db.query(
        `INSERT INTO weekly_schedule (child_id, day_of_week, sort_order) VALUES ($1, 1, 1) RETURNING id`,
        [childId]
      );
      await db.query(
        `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section, start_time, end_time)
         VALUES ($1, $2, 0, 'morgon', '07:00', '07:15')`,
        [sched.rows[0].id, a]
      );
      await db.query(
        `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section, start_time, end_time)
         VALUES ($1, $2, 1, 'morgon', '07:15', '07:20')`,
        [sched.rows[0].id, b]
      );

      const result = await saveWeeklyDayAsFamilyTemplate({
        familyId, childId, dayOfWeek: 1, templateName: 'Min morgonmall',
      });

      assert.equal(result.item_count, 2);
      assert.equal(result.template_name, 'Min morgonmall');

      const items = await db.query(
        `SELECT activity_template_id, section, start_time, end_time, sort_order
         FROM weekly_schedule_item WHERE weekly_schedule_id = $1 ORDER BY sort_order ASC`,
        [result.template_id]
      );
      assert.equal(items.rows.length, 2);
      assert.equal(items.rows[0].activity_template_id, a);
      assert.equal(items.rows[0].section, 'morgon');
      assert.equal(items.rows[0].start_time, '07:00');
      assert.equal(items.rows[0].end_time, '07:15');
      assert.equal(items.rows[1].activity_template_id, b);

      const templateRow = await db.query('SELECT family_id, child_id FROM weekly_schedule WHERE id = $1', [result.template_id]);
      assert.equal(templateRow.rows[0].family_id, familyId);
      assert.equal(templateRow.rows[0].child_id, null, 'a NEW family_template row must be created, not a repurposed child weekly_schedule row');
    });

    await t.test('save day as template: templates are copies, not live links — editing the template does not mutate the weekly day', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const a = await seedActivity(db, familyId, 'A');
      await seedWeeklyDay(db, childId, 1, [a]);

      const result = await saveWeeklyDayAsFamilyTemplate({ familyId, childId, dayOfWeek: 1, templateName: 'Mall' });

      // Mutate the saved template afterward (as if via the template item CRUD UI).
      await db.query('DELETE FROM weekly_schedule_item WHERE weekly_schedule_id = $1', [result.template_id]);
      const newActivity = await seedActivity(db, familyId, 'Ny i mallen');
      await db.query(
        `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section) VALUES ($1, $2, 0, 'morgon')`,
        [result.template_id, newActivity]
      );

      const dayRows = await weeklyItemRows(db, childId, 1);
      assert.deepEqual(dayRows.map((r) => r.activity_template_id), [a], 'the source weekly day must be unaffected by editing the saved template');
    });

    await t.test('save day as template: empty day cannot be saved', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      await assert.rejects(
        saveWeeklyDayAsFamilyTemplate({ familyId, childId, dayOfWeek: 3, templateName: 'Tom mall' }),
        ScheduleApplyError
      );
      const templates = await db.query(
        `SELECT id FROM weekly_schedule WHERE family_id = $1 AND child_id IS NULL`, [familyId]
      );
      assert.equal(templates.rows.length, 0, 'no template row must be created for an empty source day');
    });

    await t.test('save day as template: cross-family child denied, no template created', async () => {
      const { familyId: familyA } = await createTestFamilyWithChild(db);
      const { childId: childB } = await createTestFamilyWithChild(db);

      await assert.rejects(
        saveWeeklyDayAsFamilyTemplate({ familyId: familyA, childId: childB, dayOfWeek: 1, templateName: 'X' }),
        (err) => { assert.ok(err instanceof ScheduleApplyError); assert.equal(err.code, 'CHILD_NOT_IN_FAMILY'); return true; }
      );
      const templates = await db.query(
        `SELECT id FROM weekly_schedule WHERE family_id = $1 AND child_id IS NULL`, [familyA]
      );
      assert.equal(templates.rows.length, 0);
    });
  } finally {
    await db.cleanup();
  }
});
