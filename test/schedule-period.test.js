'use strict';

/**
 * Phase 2 — canonical Special Period command service (src/lib/schedule-period.js) +
 * resolveEffectiveSchedule() period composition (src/lib/effective-schedule.js).
 *
 * Require-order note: same as test/schedule-apply.test.js — src/lib/schedule-period.js
 * transitively requires src/lib/schedule-apply.js, which uses the src/lib/db.js singleton
 * pool, so it must be required lazily, inside the test body, AFTER setupTestDb() has pointed
 * DATABASE_URL at the test database.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { createTestFamilyWithChild } = require('./helpers/canonical-library-fixture.js');

async function seedActivity(db, familyId, name) {
  const res = await db.query(
    `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order)
     VALUES ($1, $2, '⭐', 1, 0) RETURNING id`,
    [familyId, name]
  );
  return res.rows[0].id;
}

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

async function seedWeeklyDay(db, childId, dayOfWeek, items, { custodyHomeId = null, weekVariant = null } = {}) {
  const sched = custodyHomeId
    ? await db.query(
        `INSERT INTO weekly_schedule (child_id, day_of_week, sort_order, custody_home_id, week_variant) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [childId, dayOfWeek, dayOfWeek, custodyHomeId, weekVariant]
      )
    : await db.query(
        `INSERT INTO weekly_schedule (child_id, day_of_week, sort_order) VALUES ($1, $2, $3) RETURNING id`,
        [childId, dayOfWeek, dayOfWeek]
      );
  let sortOrder = 0;
  for (const item of items) {
    await db.query(
      `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section)
       VALUES ($1, $2, $3, $4)`,
      [sched.rows[0].id, item.activityId, sortOrder++, item.section || 'morgon']
    );
  }
}

async function periodItemRows(db, periodId) {
  const res = await db.query(
    `SELECT activity_template_id, section FROM schedule_period_item WHERE period_id = $1 ORDER BY sort_order ASC`,
    [periodId]
  );
  return res.rows;
}

test('Phase 2 — schedule_period canonical service + resolver composition', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const {
    createSchedulePeriod, updateSchedulePeriod, deleteSchedulePeriod, getSchedulePeriod, listSchedulePeriods,
  } = require('../src/lib/schedule-period');
  const { ScheduleApplyError } = require('../src/lib/schedule-apply');
  const { resolveEffectiveSchedule, BASE_TYPES } = require('../src/lib/effective-schedule');

  try {
    // ═══ A. PERIOD CRUD ═══════════════════════════════════════════════════════
    await t.test('A1/A2: create + list', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Simskola');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId, section: 'kvall' }]);

      const result = await createSchedulePeriod({
        familyId, childId, name: 'Sommarlov', startDate: '2026-06-15', endDate: '2026-06-17',
        sourceType: 'family_template', sourceId: templateId,
      });
      assert.equal(result.name, 'Sommarlov');
      assert.equal(result.apply_mode, 'merge', 'default apply_mode must be merge, not the legacy destructive replace_day');
      assert.equal(result.items_added, 1);

      const items = await periodItemRows(db, result.period_id);
      assert.deepEqual(items.map((i) => i.activity_template_id), [activityId]);

      const list = await listSchedulePeriods({ familyId, childId });
      assert.equal(list.length, 1);
      assert.equal(list[0].id, result.period_id);
    });

    await t.test('A3: update name only is pure metadata, item set untouched', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Simskola');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId }]);
      const created = await createSchedulePeriod({
        familyId, childId, name: 'Lov', startDate: '2026-07-01', endDate: '2026-07-02',
        sourceType: 'family_template', sourceId: templateId,
      });

      const updated = await updateSchedulePeriod({ familyId, childId, periodId: created.period_id, name: 'Sommarlov v2' });
      assert.equal(updated.name, 'Sommarlov v2');
      assert.equal(updated.content_changed, false);
      assert.equal(updated.items_added, 0);
      const items = await periodItemRows(db, created.period_id);
      assert.equal(items.length, 1, 'item set must be untouched by a name-only update');
    });

    await t.test('A4: update dates re-validates range and recomputes items', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Simskola');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId }]);
      const created = await createSchedulePeriod({
        familyId, childId, name: 'Lov', startDate: '2026-08-01', endDate: '2026-08-03',
        sourceType: 'family_template', sourceId: templateId,
      });

      const updated = await updateSchedulePeriod({ familyId, childId, periodId: created.period_id, startDate: '2026-08-10', endDate: '2026-08-11' });
      assert.equal(updated.content_changed, true);
      assert.equal(updated.start_date, '2026-08-10');
      assert.equal(updated.end_date, '2026-08-11');
    });

    await t.test('A5: update source re-resolves and replaces the item set', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityA = await seedActivity(db, familyId, 'A');
      const activityB = await seedActivity(db, familyId, 'B');
      const templateA = await seedFamilyTemplate(db, familyId, [{ activityId: activityA }]);
      const templateB = await seedFamilyTemplate(db, familyId, [{ activityId: activityB }]);
      const created = await createSchedulePeriod({
        familyId, childId, name: 'Lov', startDate: '2026-09-01', endDate: '2026-09-02',
        sourceType: 'family_template', sourceId: templateA,
      });

      await updateSchedulePeriod({ familyId, childId, periodId: created.period_id, sourceType: 'family_template', sourceId: templateB });
      const items = await periodItemRows(db, created.period_id);
      assert.deepEqual(items.map((i) => i.activity_template_id), [activityB]);
    });

    await t.test('A6: update mode changes apply_mode', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'X');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId }]);
      const created = await createSchedulePeriod({
        familyId, childId, name: 'Lov', startDate: '2026-09-05', endDate: '2026-09-06',
        sourceType: 'family_template', sourceId: templateId,
      });
      const updated = await updateSchedulePeriod({ familyId, childId, periodId: created.period_id, applyMode: 'replace_day' });
      assert.equal(updated.apply_mode, 'replace_day');
    });

    await t.test('A7: delete removes the period and its items', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'X');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId }]);
      const created = await createSchedulePeriod({
        familyId, childId, name: 'Lov', startDate: '2026-09-10', endDate: '2026-09-11',
        sourceType: 'family_template', sourceId: templateId,
      });

      await deleteSchedulePeriod({ familyId, childId, periodId: created.period_id });
      const list = await listSchedulePeriods({ familyId, childId });
      assert.equal(list.length, 0);
      const items = await periodItemRows(db, created.period_id);
      assert.equal(items.length, 0, 'items must cascade-delete with the period');
    });

    await t.test('getSchedulePeriod: full detail load by id (for edit-by-ID UI)', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'X');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId }]);
      const created = await createSchedulePeriod({
        familyId, childId, name: 'Lov', startDate: '2026-09-15', endDate: '2026-09-16',
        sourceType: 'family_template', sourceId: templateId, applyMode: 'replace_sections',
      });
      const loaded = await getSchedulePeriod({ familyId, childId, periodId: created.period_id });
      assert.equal(loaded.name, 'Lov');
      assert.equal(loaded.start_date, '2026-09-15');
      assert.equal(loaded.end_date, '2026-09-16');
      assert.equal(loaded.apply_mode, 'replace_sections');
      assert.equal(loaded.items.length, 1);
    });

    // ═══ B. VALIDATION ═══════════════════════════════════════════════════════
    await t.test('B8: end_date before start_date is rejected, no writes', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'X');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId }]);
      await assert.rejects(
        createSchedulePeriod({ familyId, childId, name: 'Bad', startDate: '2026-10-05', endDate: '2026-10-01', sourceType: 'family_template', sourceId: templateId }),
        (err) => { assert.ok(err instanceof ScheduleApplyError); assert.equal(err.code, 'VALIDATION_ERROR'); return true; }
      );
      assert.equal((await listSchedulePeriods({ familyId, childId })).length, 0);
    });

    await t.test('B9: range longer than MAX_PERIOD_DAYS is rejected', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'X');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId }]);
      await assert.rejects(
        createSchedulePeriod({ familyId, childId, name: 'TooLong', startDate: '2026-01-01', endDate: '2026-12-31', sourceType: 'family_template', sourceId: templateId }),
        (err) => { assert.ok(err instanceof ScheduleApplyError); assert.equal(err.code, 'VALIDATION_ERROR'); return true; }
      );
    });

    await t.test('B10: cross-family child is denied, no writes', async () => {
      const { familyId: familyA } = await createTestFamilyWithChild(db);
      const { familyId: familyB, childId: childB } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyA, 'X');
      const templateId = await seedFamilyTemplate(db, familyA, [{ activityId }]);
      await assert.rejects(
        createSchedulePeriod({ familyId: familyA, childId: childB, name: 'Bad', startDate: '2026-10-01', endDate: '2026-10-02', sourceType: 'family_template', sourceId: templateId }),
        (err) => { assert.ok(err instanceof ScheduleApplyError); assert.equal(err.code, 'CHILD_NOT_IN_FAMILY'); return true; }
      );
      assert.equal((await listSchedulePeriods({ familyId: familyB, childId: childB })).length, 0);
    });

    await t.test('B11: family_template from another family is denied', async () => {
      const { familyId: familyA, childId: childA } = await createTestFamilyWithChild(db);
      const { familyId: familyB } = await createTestFamilyWithChild(db);
      const activityB = await seedActivity(db, familyB, 'X');
      const templateB = await seedFamilyTemplate(db, familyB, [{ activityId: activityB }]);
      await assert.rejects(
        createSchedulePeriod({ familyId: familyA, childId: childA, name: 'Bad', startDate: '2026-10-01', endDate: '2026-10-02', sourceType: 'family_template', sourceId: templateB }),
        (err) => { assert.ok(err instanceof ScheduleApplyError); assert.equal(err.code, 'SOURCE_NOT_FOUND'); return true; }
      );
    });

    await t.test('B12: activity_category is rejected as a source type', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'X');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId }]);
      await assert.rejects(
        createSchedulePeriod({ familyId, childId, name: 'Bad', startDate: '2026-10-01', endDate: '2026-10-01', sourceType: 'activity_category', sourceId: templateId }),
        (err) => { assert.ok(err instanceof ScheduleApplyError); assert.equal(err.code, 'VALIDATION_ERROR'); return true; }
      );
    });

    await t.test('B13: overlapping period for the same child is rejected, no writes', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'X');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId }]);
      await createSchedulePeriod({ familyId, childId, name: 'Höstlov', startDate: '2026-11-01', endDate: '2026-11-10', sourceType: 'family_template', sourceId: templateId });
      await assert.rejects(
        createSchedulePeriod({ familyId, childId, name: 'Overlap', startDate: '2026-11-05', endDate: '2026-11-15', sourceType: 'family_template', sourceId: templateId }),
        (err) => { assert.ok(err instanceof ScheduleApplyError); assert.equal(err.code, 'PERIOD_OVERLAP'); return true; }
      );
      assert.equal((await listSchedulePeriods({ familyId, childId })).length, 1);
    });

    await t.test('B13b: adjacent (non-overlapping) periods are allowed', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'X');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId }]);
      await createSchedulePeriod({ familyId, childId, name: 'A', startDate: '2026-12-01', endDate: '2026-12-05', sourceType: 'family_template', sourceId: templateId });
      await createSchedulePeriod({ familyId, childId, name: 'B', startDate: '2026-12-06', endDate: '2026-12-10', sourceType: 'family_template', sourceId: templateId });
      assert.equal((await listSchedulePeriods({ familyId, childId })).length, 2);
    });

    // ═══ C. COMPOSITION (Blocker A) ══════════════════════════════════════════
    await t.test('C14: merge preserves the weekly base and adds the period item', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const morningActivity = await seedActivity(db, familyId, 'Frukost');
      const dayActivity = await seedActivity(db, familyId, 'Skola');
      const eveningWeeklyActivity = await seedActivity(db, familyId, 'Läsa');
      const periodEveningActivity = await seedActivity(db, familyId, 'Lovaktivitet');
      await seedWeeklyDay(db, childId, 2, [ // a Tuesday
        { activityId: morningActivity, section: 'morgon' },
        { activityId: dayActivity, section: 'dag' },
        { activityId: eveningWeeklyActivity, section: 'kvall' },
      ]);
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId: periodEveningActivity, section: 'kvall' }]);

      await createSchedulePeriod({
        familyId, childId, name: 'Kvällslov', startDate: '2027-01-05', endDate: '2027-01-05', // a Tuesday
        sourceType: 'family_template', sourceId: templateId, applyMode: 'merge',
      });

      const resolved = await resolveEffectiveSchedule(childId, '2027-01-05');
      assert.equal(resolved.source.base_type, BASE_TYPES.SPECIAL_PERIOD);
      const bySection = {};
      for (const item of resolved.items) (bySection[item.section] ||= []).push(item.activity_template_id);
      assert.deepEqual(bySection.morgon, [morningActivity], 'morgon must be untouched — "en kvällsmall får inte påverka morgonen"');
      assert.deepEqual(bySection.dag, [dayActivity], 'dag must be untouched');
      assert.deepEqual((bySection.kvall || []).sort(), [eveningWeeklyActivity, periodEveningActivity].sort(), 'kvall must have BOTH the weekly and period items under merge');
    });

    await t.test('C15: replace_sections preserves untouched sections and only replaces the source-covered ones', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const morningActivity = await seedActivity(db, familyId, 'Frukost');
      const dayActivity = await seedActivity(db, familyId, 'Skola');
      const oldEveningActivity = await seedActivity(db, familyId, 'Läsa');
      const newEveningActivity = await seedActivity(db, familyId, 'Lovkväll');
      await seedWeeklyDay(db, childId, 3, [ // a Wednesday
        { activityId: morningActivity, section: 'morgon' },
        { activityId: dayActivity, section: 'dag' },
        { activityId: oldEveningActivity, section: 'kvall' },
      ]);
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId: newEveningActivity, section: 'kvall' }]);

      await createSchedulePeriod({
        familyId, childId, name: 'Kvällslov', startDate: '2027-01-06', endDate: '2027-01-06',
        sourceType: 'family_template', sourceId: templateId, applyMode: 'replace_sections',
      });

      const resolved = await resolveEffectiveSchedule(childId, '2027-01-06');
      const bySection = {};
      for (const item of resolved.items) (bySection[item.section] ||= []).push(item.activity_template_id);
      assert.deepEqual(bySection.morgon, [morningActivity]);
      assert.deepEqual(bySection.dag, [dayActivity]);
      assert.deepEqual(bySection.kvall, [newEveningActivity], 'kvall must be fully replaced by the period, not merged with the old weekly item');
    });

    await t.test('C16: replace_day replaces the whole base — no weekly leakage', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const morningActivity = await seedActivity(db, familyId, 'Frukost');
      const dayActivity = await seedActivity(db, familyId, 'Skola');
      const periodActivity = await seedActivity(db, familyId, 'Lovdag');
      await seedWeeklyDay(db, childId, 4, [
        { activityId: morningActivity, section: 'morgon' },
        { activityId: dayActivity, section: 'dag' },
      ]);
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId: periodActivity, section: 'dag' }]);

      await createSchedulePeriod({
        familyId, childId, name: 'Heldagslov', startDate: '2027-01-07', endDate: '2027-01-07',
        sourceType: 'family_template', sourceId: templateId, applyMode: 'replace_day',
      });

      const resolved = await resolveEffectiveSchedule(childId, '2027-01-07');
      assert.deepEqual(resolved.items.map((i) => i.activity_template_id), [periodActivity], 'replace_day must show ONLY the period item — weekly morgon/dag must not leak through');
    });

    // ═══ D. SPECIAL DAY INDEPENDENCE (Blocker B) ═════════════════════════════
    await t.test('D17/D18/D19: explicit Special Day wins over an active period, and survives period delete + re-materialization', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const periodActivity = await seedActivity(db, familyId, 'Lovaktivitet');
      const explicitActivity = await seedActivity(db, familyId, 'Julafton');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId: periodActivity }]);

      const period = await createSchedulePeriod({
        familyId, childId, name: 'Jullov', startDate: '2026-12-20', endDate: '2026-12-27',
        sourceType: 'family_template', sourceId: templateId,
      });

      // Parent explicitly overrides one date (2026-12-24) via the completely separate,
      // untouched special_day_schedule table/routes.
      const explicitSd = await db.query(`INSERT INTO special_day_schedule (child_id, date) VALUES ($1, '2026-12-24') RETURNING id`, [childId]);
      await db.query(
        `INSERT INTO special_day_schedule_item (special_day_schedule_id, activity_template_id, name, section, sort_order) VALUES ($1, $2, 'Julafton', 'morgon', 0)`,
        [explicitSd.rows[0].id, explicitActivity]
      );

      let resolved = await resolveEffectiveSchedule(childId, '2026-12-24');
      assert.equal(resolved.source.base_type, BASE_TYPES.SPECIAL_DAY, 'explicit Special Day must win over the active period');
      assert.deepEqual(resolved.items.map((i) => i.activity_template_id), [explicitActivity]);

      // Neighboring period dates are still period-governed.
      resolved = await resolveEffectiveSchedule(childId, '2026-12-23');
      assert.equal(resolved.source.base_type, BASE_TYPES.SPECIAL_PERIOD);
      resolved = await resolveEffectiveSchedule(childId, '2026-12-25');
      assert.equal(resolved.source.base_type, BASE_TYPES.SPECIAL_PERIOD);

      // Re-materializing the period (update triggers delete+recreate of period_item rows)
      // must not touch the unrelated special_day_schedule row for 2026-12-24.
      await updateSchedulePeriod({ familyId, childId, periodId: period.period_id, applyMode: 'replace_day' });
      resolved = await resolveEffectiveSchedule(childId, '2026-12-24');
      assert.equal(resolved.source.base_type, BASE_TYPES.SPECIAL_DAY, 'explicit override must survive a period update/re-materialization');
      assert.deepEqual(resolved.items.map((i) => i.activity_template_id), [explicitActivity]);

      // Deleting the period entirely must not delete the explicit Special Day.
      await deleteSchedulePeriod({ familyId, childId, periodId: period.period_id });
      resolved = await resolveEffectiveSchedule(childId, '2026-12-24');
      assert.equal(resolved.source.base_type, BASE_TYPES.SPECIAL_DAY, 'explicit Special Day must survive period delete');
      assert.deepEqual(resolved.items.map((i) => i.activity_template_id), [explicitActivity]);

      // Dates without an explicit override fall back to weekly/custody after the period is gone.
      resolved = await resolveEffectiveSchedule(childId, '2026-12-23');
      assert.notEqual(resolved.source.base_type, BASE_TYPES.SPECIAL_PERIOD);
    });

    // ═══ E. OVERLAYS ═════════════════════════════════════════════════════════
    await t.test('E20/E21: date exclusion removes an effective item under a period, on that date only', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const weeklyActivity = await seedActivity(db, familyId, 'Veckoaktivitet');
      const periodActivity = await seedActivity(db, familyId, 'Lovaktivitet');
      await seedWeeklyDay(db, childId, 5, [{ activityId: weeklyActivity, section: 'morgon' }]); // Friday
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId: periodActivity, section: 'kvall' }]);
      await createSchedulePeriod({
        familyId, childId, name: 'Lov', startDate: '2027-02-05', endDate: '2027-02-19', // covers two Fridays
        sourceType: 'family_template', sourceId: templateId, applyMode: 'merge',
      });

      // Exclude the weekly item on ONE of the two Fridays only.
      await db.query(`INSERT INTO schedule_date_exclusion (child_id, date, activity_template_id) VALUES ($1, '2027-02-05', $2)`, [childId, weeklyActivity]);

      const excludedDay = await resolveEffectiveSchedule(childId, '2027-02-05');
      assert.ok(!excludedDay.items.some((i) => i.activity_template_id === weeklyActivity), 'excluded weekly item must be absent from the effective (period-composed) result on that date');
      assert.ok(excludedDay.items.some((i) => i.activity_template_id === periodActivity), 'the period item itself must remain');

      const neighborDay = await resolveEffectiveSchedule(childId, '2027-02-12');
      assert.ok(neighborDay.items.some((i) => i.activity_template_id === weeklyActivity), 'the exclusion must not leak to a neighboring period date');
      assert.ok(neighborDay.items.some((i) => i.activity_template_id === periodActivity), 'the period must remain intact on the neighboring date');
    });

    await t.test('E20b: excluding a PERIOD-sourced item under merge removes it, weekly item remains (the bug this hardening fixes)', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const weeklyActivity = await seedActivity(db, familyId, 'Frukost');
      const periodActivity = await seedActivity(db, familyId, 'Simskola');
      await seedWeeklyDay(db, childId, 1, [{ activityId: weeklyActivity, section: 'morgon' }]); // Monday
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId: periodActivity, section: 'kvall' }]);
      await createSchedulePeriod({
        familyId, childId, name: 'Simlov', startDate: '2027-04-12', endDate: '2027-04-12', // a Monday
        sourceType: 'family_template', sourceId: templateId, applyMode: 'merge',
      });

      // Exclude the PERIOD's own item — before this fix, exclusions were only ever applied to
      // the weekly portion BEFORE composition, so a period item could never be removed "bara
      // idag".
      await db.query(`INSERT INTO schedule_date_exclusion (child_id, date, activity_template_id) VALUES ($1, '2027-04-12', $2)`, [childId, periodActivity]);

      const resolved = await resolveEffectiveSchedule(childId, '2027-04-12');
      assert.ok(!resolved.items.some((i) => i.activity_template_id === periodActivity), 'the excluded PERIOD item must be absent from the effective result');
      assert.ok(resolved.items.some((i) => i.activity_template_id === weeklyActivity), 'the weekly item must remain — only the period item was excluded');

      // The period definition itself must be untouched — a neighboring date (same period,
      // 1-day period here so re-use the create call to prove the row is unaffected instead).
      const periodRow = await db.query(`SELECT COUNT(*)::int AS n FROM schedule_period_item WHERE period_id = (SELECT id FROM schedule_period WHERE child_id = $1)`, [childId]);
      assert.equal(periodRow.rows[0].n, 1, 'the exclusion must never mutate schedule_period_item — it is a pure date overlay');
    });

    await t.test('E20c: replace_sections — exclusion removes the period-supplied section item, the OLD weekly item for that section does not reappear', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const morningActivity = await seedActivity(db, familyId, 'Frukost');
      const oldEveningActivity = await seedActivity(db, familyId, 'Läsa');
      const newEveningActivity = await seedActivity(db, familyId, 'Lovkväll');
      await seedWeeklyDay(db, childId, 3, [ // a Wednesday
        { activityId: morningActivity, section: 'morgon' },
        { activityId: oldEveningActivity, section: 'kvall' },
      ]);
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId: newEveningActivity, section: 'kvall' }]);
      await createSchedulePeriod({
        familyId, childId, name: 'Kvällslov', startDate: '2027-04-14', endDate: '2027-04-14',
        sourceType: 'family_template', sourceId: templateId, applyMode: 'replace_sections',
      });

      await db.query(`INSERT INTO schedule_date_exclusion (child_id, date, activity_template_id) VALUES ($1, '2027-04-14', $2)`, [childId, newEveningActivity]);

      const resolved = await resolveEffectiveSchedule(childId, '2027-04-14');
      assert.deepEqual(resolved.items.map((i) => i.activity_template_id), [morningActivity], 'morgon must remain; the excluded period item (kvall) must be gone; the OLD weekly kvall item must NOT reappear');
    });

    await t.test('E20d: replace_day — excluding the only period item yields an EMPTY effective result, base_type stays special_period, weekly does not leak back in', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const weeklyActivity = await seedActivity(db, familyId, 'Frukost');
      const periodActivity = await seedActivity(db, familyId, 'Lovdag');
      await seedWeeklyDay(db, childId, 4, [{ activityId: weeklyActivity, section: 'morgon' }]); // Thursday
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId: periodActivity }]);
      await createSchedulePeriod({
        familyId, childId, name: 'Heldagslov', startDate: '2027-04-15', endDate: '2027-04-15',
        sourceType: 'family_template', sourceId: templateId, applyMode: 'replace_day',
      });

      await db.query(`INSERT INTO schedule_date_exclusion (child_id, date, activity_template_id) VALUES ($1, '2027-04-15', $2)`, [childId, periodActivity]);

      const resolved = await resolveEffectiveSchedule(childId, '2027-04-15');
      assert.equal(resolved.source.base_type, BASE_TYPES.SPECIAL_PERIOD, 'base_type must remain special_period even though the effective result is empty');
      assert.deepEqual(resolved.items, [], 'result must be an EMPTY list — must not fall back to weekly merely because the only period item was excluded');
    });

    await t.test('E20e: a populated explicit Special Day is unaffected by a matching date exclusion (legacy semantics preserved)', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const explicitActivity = await seedActivity(db, familyId, 'Julafton');
      const sd = await db.query(`INSERT INTO special_day_schedule (child_id, date) VALUES ($1, '2027-04-16') RETURNING id`, [childId]);
      await db.query(
        `INSERT INTO special_day_schedule_item (special_day_schedule_id, activity_template_id, name, section, sort_order) VALUES ($1, $2, 'Julafton', 'morgon', 0)`,
        [sd.rows[0].id, explicitActivity]
      );
      await db.query(`INSERT INTO schedule_date_exclusion (child_id, date, activity_template_id) VALUES ($1, '2027-04-16', $2)`, [childId, explicitActivity]);

      const resolved = await resolveEffectiveSchedule(childId, '2027-04-16');
      assert.equal(resolved.source.base_type, BASE_TYPES.SPECIAL_DAY);
      assert.deepEqual(resolved.items.map((i) => i.activity_template_id), [explicitActivity], 'a matching date exclusion must NOT filter a populated explicit Special Day — legacy behaviour preserved');
    });

    await t.test('E20f: with no active period, existing weekly-only exclusion behaviour is unchanged', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const keptActivity = await seedActivity(db, familyId, 'Frukost');
      const excludedActivity = await seedActivity(db, familyId, 'Läsa');
      await seedWeeklyDay(db, childId, 6, [ // Saturday, no period
        { activityId: keptActivity, section: 'morgon' },
        { activityId: excludedActivity, section: 'kvall' },
      ]);
      await db.query(`INSERT INTO schedule_date_exclusion (child_id, date, activity_template_id) VALUES ($1, '2027-04-17', $2)`, [childId, excludedActivity]);

      const resolved = await resolveEffectiveSchedule(childId, '2027-04-17');
      assert.equal(resolved.source.base_type, BASE_TYPES.WEEKLY);
      assert.deepEqual(resolved.items.map((i) => i.activity_template_id), [keptActivity]);
    });

    await t.test('E22: once-task remains additive and does not appear in / interact with resolveEffectiveSchedule() under a period', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const periodActivity = await seedActivity(db, familyId, 'Lovaktivitet');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId: periodActivity }]);
      await createSchedulePeriod({
        familyId, childId, name: 'Lov', startDate: '2027-03-01', endDate: '2027-03-02',
        sourceType: 'family_template', sourceId: templateId,
      });

      // resolveEffectiveSchedule() intentionally never returns once-tasks (pre-existing
      // boundary, documented in effective-schedule.js) — confirm this is unaffected by an
      // active period (i.e. the boundary was not accidentally widened or narrowed).
      const resolved = await resolveEffectiveSchedule(childId, '2027-03-01');
      assert.ok(resolved.items.every((i) => i.activity_template_id !== null), 'no once-task placeholder should appear in the resolver output');
    });

    // ═══ F. CUSTODY ══════════════════════════════════════════════════════════
    await t.test('F23/F24: a period overrides whichever custody weekly base is effective; correct base returns after delete', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const homeA = await db.query(`INSERT INTO custody_home (family_id, label) VALUES ($1, 'Hos mamma') RETURNING id`, [familyId]);
      const homeB = await db.query(`INSERT INTO custody_home (family_id, label) VALUES ($1, 'Hos pappa') RETURNING id`, [familyId]);
      await db.query(
        `INSERT INTO custody_pattern (child_id, anchor_date, interval_weeks, week_a_home_id, week_b_home_id, pattern_type) VALUES ($1, '2027-04-05', 2, $2, $3, 'alternate_weeks')`,
        [childId, homeA.rows[0].id, homeB.rows[0].id]
      );
      const homeAActivity = await seedActivity(db, familyId, 'Hos mamma-aktivitet');
      const homeBActivity = await seedActivity(db, familyId, 'Hos pappa-aktivitet');
      await seedWeeklyDay(db, childId, 2, [{ activityId: homeAActivity }], { custodyHomeId: homeA.rows[0].id, weekVariant: 'a' }); // Tuesday
      await seedWeeklyDay(db, childId, 2, [{ activityId: homeBActivity }], { custodyHomeId: homeB.rows[0].id, weekVariant: 'b' });

      const periodActivity = await seedActivity(db, familyId, 'Period-aktivitet');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId: periodActivity }]);
      const period = await createSchedulePeriod({
        familyId, childId, name: 'Lov över båda hemmen', startDate: '2027-04-06', endDate: '2027-04-06', // a Tuesday
        sourceType: 'family_template', sourceId: templateId, applyMode: 'replace_day',
      });

      const resolved = await resolveEffectiveSchedule(childId, '2027-04-06');
      assert.equal(resolved.source.base_type, BASE_TYPES.SPECIAL_PERIOD);
      assert.deepEqual(resolved.items.map((i) => i.activity_template_id), [periodActivity],
        'the period overrides regardless of which custody home would otherwise be effective — no per-home duplication required');

      // schedule_period has no custody_home_id column — confirms the deliberate design decision.
      const cols = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'schedule_period'`);
      assert.ok(!cols.rows.some((r) => r.column_name === 'custody_home_id'));

      await deleteSchedulePeriod({ familyId, childId, periodId: period.period_id });
      const afterDelete = await resolveEffectiveSchedule(childId, '2027-04-06');
      assert.notEqual(afterDelete.source.base_type, BASE_TYPES.SPECIAL_PERIOD, 'after delete, the correct custody-aware weekly base must return');
      assert.equal(afterDelete.source.base_type, BASE_TYPES.WEEKLY);
    });

    // ═══ G. EMPTY SPECIAL DAY ════════════════════════════════════════════════
    await t.test('G25: an empty explicit Special Day still falls through — to the period when one is active, else to weekly (preserved intent, extended for Phase 2)', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const periodActivity = await seedActivity(db, familyId, 'Lovaktivitet');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId: periodActivity }]);
      await createSchedulePeriod({
        familyId, childId, name: 'Lov', startDate: '2027-05-01', endDate: '2027-05-02',
        sourceType: 'family_template', sourceId: templateId,
      });
      // An empty explicit special day row (0 items) — e.g. a parent marked "scheduled day off"
      // without content — for a date inside the period.
      await db.query(`INSERT INTO special_day_schedule (child_id, date) VALUES ($1, '2027-05-01')`, [childId]);

      const resolved = await resolveEffectiveSchedule(childId, '2027-05-01');
      assert.equal(resolved.source.base_type, BASE_TYPES.SPECIAL_PERIOD, 'an empty explicit special day must fall through to the active period, not stay stuck as an empty override');
      assert.deepEqual(resolved.items.map((i) => i.activity_template_id), [periodActivity]);
    });

    await t.test('G25b: an empty explicit Special Day with NO active period still falls through to weekly (unchanged pre-Phase-2 behaviour)', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const weeklyActivity = await seedActivity(db, familyId, 'Veckoaktivitet');
      await seedWeeklyDay(db, childId, 6, [{ activityId: weeklyActivity }]); // Saturday
      await db.query(`INSERT INTO special_day_schedule (child_id, date) VALUES ($1, '2027-05-08')`, [childId]); // a Saturday, no period

      const resolved = await resolveEffectiveSchedule(childId, '2027-05-08');
      assert.equal(resolved.source.base_type, BASE_TYPES.WEEKLY);
      assert.deepEqual(resolved.items.map((i) => i.activity_template_id), [weeklyActivity]);
    });

    // ═══ H. RANGE SAFETY ═════════════════════════════════════════════════════
    await t.test('H26/H27: dates outside the period range are unaffected', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const weeklyActivity = await seedActivity(db, familyId, 'Veckoaktivitet');
      await seedWeeklyDay(db, childId, 0, [{ activityId: weeklyActivity }]); // Sunday (dow 0)
      const periodActivity = await seedActivity(db, familyId, 'Lovaktivitet');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId: periodActivity }]);
      await createSchedulePeriod({
        familyId, childId, name: 'Kort period', startDate: '2027-06-13', endDate: '2027-06-13', // a Sunday
        sourceType: 'family_template', sourceId: templateId,
      });

      const dayBefore = await resolveEffectiveSchedule(childId, '2027-06-12');
      assert.notEqual(dayBefore.source.base_type, BASE_TYPES.SPECIAL_PERIOD, 'day before start must be unaffected');
      const dayAfter = await resolveEffectiveSchedule(childId, '2027-06-14');
      assert.notEqual(dayAfter.source.base_type, BASE_TYPES.SPECIAL_PERIOD, 'day after end must be unaffected');
      const dayOf = await resolveEffectiveSchedule(childId, '2027-06-13');
      assert.equal(dayOf.source.base_type, BASE_TYPES.SPECIAL_PERIOD);
    });

    // ═══ I. CONCURRENCY (Blocker C) ══════════════════════════════════════════
    await t.test('I28: two concurrent overlapping creates for the same child — exactly one succeeds, one gets PERIOD_OVERLAP, DB has one period', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'X');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId }]);

      const results = await Promise.allSettled([
        createSchedulePeriod({ familyId, childId, name: 'A', startDate: '2027-07-01', endDate: '2027-07-10', sourceType: 'family_template', sourceId: templateId }),
        createSchedulePeriod({ familyId, childId, name: 'B', startDate: '2027-07-05', endDate: '2027-07-15', sourceType: 'family_template', sourceId: templateId }),
      ]);

      const succeeded = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter((r) => r.status === 'rejected');
      assert.equal(succeeded.length, 1, 'exactly one concurrent overlapping create must succeed');
      assert.equal(failed.length, 1, 'exactly one must fail');
      assert.equal(failed[0].reason.code, 'PERIOD_OVERLAP');

      const list = await listSchedulePeriods({ familyId, childId });
      assert.equal(list.length, 1, 'the database must contain exactly one period, not a race-created duplicate');
    });

    await t.test('I29: two concurrent NON-overlapping creates for the same child both succeed', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'X');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId }]);

      const results = await Promise.allSettled([
        createSchedulePeriod({ familyId, childId, name: 'A', startDate: '2027-08-01', endDate: '2027-08-05', sourceType: 'family_template', sourceId: templateId }),
        createSchedulePeriod({ familyId, childId, name: 'B', startDate: '2027-08-10', endDate: '2027-08-15', sourceType: 'family_template', sourceId: templateId }),
      ]);
      assert.ok(results.every((r) => r.status === 'fulfilled'), 'non-overlapping concurrent creates must both succeed');
      assert.equal((await listSchedulePeriods({ familyId, childId })).length, 2);
    });

    await t.test('I30: concurrent create-overlapping-into-updated-range vs update — invariant preserved', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'X');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId }]);
      const existing = await createSchedulePeriod({ familyId, childId, name: 'Existing', startDate: '2027-09-01', endDate: '2027-09-05', sourceType: 'family_template', sourceId: templateId });

      // Concurrently: (a) move the existing period to overlap 2027-09-20..25, and (b) create a
      // brand new period at 2027-09-20..25. At most one of these two operations may end up
      // owning that range — the invariant is that the DB never ends up with TWO periods
      // covering the same dates for this child.
      const results = await Promise.allSettled([
        updateSchedulePeriod({ familyId, childId, periodId: existing.period_id, startDate: '2027-09-20', endDate: '2027-09-25' }),
        createSchedulePeriod({ familyId, childId, name: 'New', startDate: '2027-09-20', endDate: '2027-09-25', sourceType: 'family_template', sourceId: templateId }),
      ]);

      const succeeded = results.filter((r) => r.status === 'fulfilled');
      assert.equal(succeeded.length, 1, 'exactly one of the two conflicting operations may succeed');

      const list = await listSchedulePeriods({ familyId, childId });
      const covering2027_09_22 = list.filter((p) => p.start_date <= '2027-09-22' && p.end_date >= '2027-09-22');
      assert.equal(covering2027_09_22.length, 1, 'the DB must never end up with two periods covering the same date for this child');
    });

    await t.test('I31: same operation_id retried concurrently still replays exactly once (idempotency under concurrency)', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'X');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId }]);
      const opId = 'concurrent-idem-op-1';

      const results = await Promise.allSettled([
        createSchedulePeriod({ familyId, childId, name: 'Idem', startDate: '2027-10-01', endDate: '2027-10-01', sourceType: 'family_template', sourceId: templateId, operationId: opId }),
        createSchedulePeriod({ familyId, childId, name: 'Idem', startDate: '2027-10-01', endDate: '2027-10-01', sourceType: 'family_template', sourceId: templateId, operationId: opId }),
      ]);
      assert.ok(results.every((r) => r.status === 'fulfilled'), 'both concurrent calls with the SAME operation_id must succeed (one executes, one replays)');
      const list = await listSchedulePeriods({ familyId, childId });
      assert.equal(list.length, 1, 'must not create two periods for the same operation_id');
    });

    // ═══ J. LEGACY COMPATIBILITY ═════════════════════════════════════════════
    await t.test('J30/J31: legacy apply-date-range route and special-day-schedules routes still load, untouched', async () => {
      assert.ok(require('../src/routes/schedules/child-bulk'), 'child-bulk.js (apply-date-range) must still load');
      assert.ok(require('../src/routes/special-day-schedules'), 'special-day-schedules.js must still load');
    });
  } finally {
    await db.cleanup();
  }
});
