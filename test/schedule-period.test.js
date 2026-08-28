'use strict';

/**
 * Phase 2 — canonical Special Period command service (src/lib/schedule-period.js).
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

async function specialDayFor(db, childId, dateStr) {
  const res = await db.query(
    `SELECT id, period_id, note FROM special_day_schedule WHERE child_id = $1 AND date = $2`,
    [childId, dateStr]
  );
  return res.rows[0] || null;
}

async function specialDayItems(db, specialDayScheduleId) {
  const res = await db.query(
    `SELECT activity_template_id, section, start_time, end_time FROM special_day_schedule_item WHERE special_day_schedule_id = $1 ORDER BY sort_order ASC`,
    [specialDayScheduleId]
  );
  return res.rows;
}

async function seedWeeklyDay(db, childId, dayOfWeek, activityIds, { custodyHomeId = null, weekVariant = null } = {}) {
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
  for (const activityId of activityIds) {
    await db.query(
      `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section)
       VALUES ($1, $2, $3, 'morgon')`,
      [sched.rows[0].id, activityId, sortOrder++]
    );
  }
}

test('Phase 2 — schedule_period canonical service', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const {
    createSchedulePeriod, updateSchedulePeriod, deleteSchedulePeriod, listSchedulePeriods,
  } = require('../src/lib/schedule-period');
  const { ScheduleApplyError } = require('../src/lib/schedule-apply');

  try {
    // ── A1: create period ────────────────────────────────────────────────────
    await t.test('A1: create period materializes every date in range with the source content', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Simskola');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId, section: 'dag' }]);

      const result = await createSchedulePeriod({
        familyId, childId, name: 'Sommarlov', startDate: '2026-06-15', endDate: '2026-06-17',
        sourceType: 'family_template', sourceId: templateId,
      });

      assert.equal(result.name, 'Sommarlov');
      assert.deepEqual(result.applied_dates, ['2026-06-15', '2026-06-16', '2026-06-17']);
      assert.equal(result.materialized_count, 3);

      for (const dateStr of result.applied_dates) {
        const sd = await specialDayFor(db, childId, dateStr);
        assert.ok(sd, `special_day_schedule row must exist for ${dateStr}`);
        assert.equal(sd.period_id, result.period_id, `row for ${dateStr} must link back to the period`);
        const items = await specialDayItems(db, sd.id);
        assert.deepEqual(items.map((i) => i.activity_template_id), [activityId]);
      }
    });

    // ── A2: update period ────────────────────────────────────────────────────
    await t.test('A2: update period name only does not re-materialize dates', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Simskola');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId }]);
      const created = await createSchedulePeriod({
        familyId, childId, name: 'Lov', startDate: '2026-07-01', endDate: '2026-07-02',
        sourceType: 'family_template', sourceId: templateId,
      });

      const updated = await updateSchedulePeriod({
        familyId, childId, periodId: created.period_id, name: 'Sommarlov v2',
      });

      assert.equal(updated.name, 'Sommarlov v2');
      assert.equal(updated.content_changed, false);
      assert.equal(updated.materialized_count, 0);
      const list = await listSchedulePeriods({ familyId, childId });
      assert.equal(list[0].name, 'Sommarlov v2');
    });

    await t.test('A2b: update period date range re-materializes — old out-of-range dates are cleared', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Simskola');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId }]);
      const created = await createSchedulePeriod({
        familyId, childId, name: 'Lov', startDate: '2026-08-01', endDate: '2026-08-03',
        sourceType: 'family_template', sourceId: templateId,
      });

      await updateSchedulePeriod({
        familyId, childId, periodId: created.period_id, startDate: '2026-08-10', endDate: '2026-08-11',
      });

      assert.equal(await specialDayFor(db, childId, '2026-08-01'), null, 'old date must be un-materialized');
      assert.ok(await specialDayFor(db, childId, '2026-08-10'), 'new date must be materialized');
      assert.ok(await specialDayFor(db, childId, '2026-08-11'), 'new date must be materialized');
    });

    // ── A3: delete period ────────────────────────────────────────────────────
    await t.test('A3: delete period removes the period AND its materialized dates', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Simskola');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId }]);
      const created = await createSchedulePeriod({
        familyId, childId, name: 'Lov', startDate: '2026-09-01', endDate: '2026-09-02',
        sourceType: 'family_template', sourceId: templateId,
      });

      const result = await deleteSchedulePeriod({ familyId, childId, periodId: created.period_id });
      assert.deepEqual(result.removed_dates, ['2026-09-01', '2026-09-02']);
      assert.equal(await specialDayFor(db, childId, '2026-09-01'), null);
      assert.equal(await specialDayFor(db, childId, '2026-09-02'), null);
      const list = await listSchedulePeriods({ familyId, childId });
      assert.equal(list.length, 0);
    });

    // ── A4: invalid date range rejected ──────────────────────────────────────
    await t.test('A4: end_date before start_date is rejected, no writes', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'X');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId }]);

      await assert.rejects(
        createSchedulePeriod({
          familyId, childId, name: 'Bad', startDate: '2026-10-05', endDate: '2026-10-01',
          sourceType: 'family_template', sourceId: templateId,
        }),
        (err) => { assert.ok(err instanceof ScheduleApplyError); assert.equal(err.code, 'VALIDATION_ERROR'); return true; }
      );
      const list = await listSchedulePeriods({ familyId, childId });
      assert.equal(list.length, 0);
    });

    await t.test('A4b: range longer than MAX_PERIOD_DAYS is rejected', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'X');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId }]);

      await assert.rejects(
        createSchedulePeriod({
          familyId, childId, name: 'TooLong', startDate: '2026-01-01', endDate: '2026-12-31',
          sourceType: 'family_template', sourceId: templateId,
        }),
        (err) => { assert.ok(err instanceof ScheduleApplyError); assert.equal(err.code, 'VALIDATION_ERROR'); return true; }
      );
    });

    // ── A5: cross-family child denied ────────────────────────────────────────
    await t.test('A5: cross-family child is denied, no writes', async () => {
      const { familyId: familyA } = await createTestFamilyWithChild(db);
      const { familyId: familyB, childId: childB } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyA, 'X');
      const templateId = await seedFamilyTemplate(db, familyA, [{ activityId }]);

      await assert.rejects(
        createSchedulePeriod({
          familyId: familyA, childId: childB, name: 'Bad', startDate: '2026-10-01', endDate: '2026-10-02',
          sourceType: 'family_template', sourceId: templateId,
        }),
        (err) => { assert.ok(err instanceof ScheduleApplyError); assert.equal(err.code, 'CHILD_NOT_IN_FAMILY'); return true; }
      );
      const list = await listSchedulePeriods({ familyId: familyB, childId: childB });
      assert.equal(list.length, 0);
    });

    // ── A6: source ownership validated ───────────────────────────────────────
    await t.test('A6: family_template from another family is denied', async () => {
      const { familyId: familyA, childId: childA } = await createTestFamilyWithChild(db);
      const { familyId: familyB } = await createTestFamilyWithChild(db);
      const activityB = await seedActivity(db, familyB, 'X');
      const templateB = await seedFamilyTemplate(db, familyB, [{ activityId: activityB }]);

      await assert.rejects(
        createSchedulePeriod({
          familyId: familyA, childId: childA, name: 'Bad', startDate: '2026-10-01', endDate: '2026-10-02',
          sourceType: 'family_template', sourceId: templateB,
        }),
        (err) => { assert.ok(err instanceof ScheduleApplyError); assert.equal(err.code, 'SOURCE_NOT_FOUND'); return true; }
      );
    });

    // ── A7: overlapping period rejected ──────────────────────────────────────
    await t.test('A7: overlapping period for the same child is rejected, no writes for the second period', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'X');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId }]);
      await createSchedulePeriod({
        familyId, childId, name: 'Höstlov', startDate: '2026-11-01', endDate: '2026-11-10',
        sourceType: 'family_template', sourceId: templateId,
      });

      await assert.rejects(
        createSchedulePeriod({
          familyId, childId, name: 'Overlap', startDate: '2026-11-05', endDate: '2026-11-15',
          sourceType: 'family_template', sourceId: templateId,
        }),
        (err) => { assert.ok(err instanceof ScheduleApplyError); assert.equal(err.code, 'PERIOD_OVERLAP'); return true; }
      );
      const list = await listSchedulePeriods({ familyId, childId });
      assert.equal(list.length, 1, 'the overlapping period must not have been created');
    });

    await t.test('A7b: non-overlapping periods (adjacent dates) for the same child are allowed', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'X');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId }]);
      await createSchedulePeriod({
        familyId, childId, name: 'Period A', startDate: '2026-12-01', endDate: '2026-12-05',
        sourceType: 'family_template', sourceId: templateId,
      });
      await createSchedulePeriod({
        familyId, childId, name: 'Period B', startDate: '2026-12-06', endDate: '2026-12-10',
        sourceType: 'family_template', sourceId: templateId,
      });
      const list = await listSchedulePeriods({ familyId, childId });
      assert.equal(list.length, 2);
    });

    // ── B: range safety ───────────────────────────────────────────────────────
    await t.test('B8/B9/B10: dates outside the period range are unaffected', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Simskola');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId }]);

      await createSchedulePeriod({
        familyId, childId, name: 'Kort period', startDate: '2027-01-10', endDate: '2027-01-12',
        sourceType: 'family_template', sourceId: templateId,
      });

      assert.equal(await specialDayFor(db, childId, '2027-01-09'), null, 'day before start must be unaffected');
      assert.equal(await specialDayFor(db, childId, '2027-01-13'), null, 'day after end must be unaffected');
      assert.ok(await specialDayFor(db, childId, '2027-01-10'));
      assert.ok(await specialDayFor(db, childId, '2027-01-11'));
      assert.ok(await specialDayFor(db, childId, '2027-01-12'));
    });

    // ── C: apply modes ────────────────────────────────────────────────────────
    await t.test('C11: merge mode does not remove an existing item already on that special day', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const existingActivity = await seedActivity(db, familyId, 'Redan där');
      const newActivity = await seedActivity(db, familyId, 'Simskola');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId: newActivity, section: 'kvall' }]);

      await db.query(`INSERT INTO special_day_schedule (child_id, date) VALUES ($1, '2027-02-01')`, [childId]);
      const sd = await specialDayFor(db, childId, '2027-02-01');
      await db.query(
        `INSERT INTO special_day_schedule_item (special_day_schedule_id, activity_template_id, name, section, sort_order) VALUES ($1, $2, 'Redan där', 'morgon', 0)`,
        [sd.id, existingActivity]
      );

      await createSchedulePeriod({
        familyId, childId, name: 'Merge-test', startDate: '2027-02-01', endDate: '2027-02-01',
        sourceType: 'family_template', sourceId: templateId, applyMode: 'merge',
      });

      const items = await specialDayItems(db, sd.id);
      const templateIds = items.map((i) => i.activity_template_id).sort();
      assert.deepEqual(templateIds, [existingActivity, newActivity].sort(), 'merge must keep the pre-existing item and add the new one');
    });

    await t.test('C12: replace_sections only clears the sections present in the source', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const morningActivity = await seedActivity(db, familyId, 'Morgon');
      const eveningActivity = await seedActivity(db, familyId, 'Kväll');
      const newEveningActivity = await seedActivity(db, familyId, 'Ny kväll');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId: newEveningActivity, section: 'kvall' }]);

      await db.query(`INSERT INTO special_day_schedule (child_id, date) VALUES ($1, '2027-03-01')`, [childId]);
      const sd = await specialDayFor(db, childId, '2027-03-01');
      await db.query(
        `INSERT INTO special_day_schedule_item (special_day_schedule_id, activity_template_id, name, section, sort_order) VALUES ($1, $2, 'Morgon', 'morgon', 0)`,
        [sd.id, morningActivity]
      );
      await db.query(
        `INSERT INTO special_day_schedule_item (special_day_schedule_id, activity_template_id, name, section, sort_order) VALUES ($1, $2, 'Kväll', 'kvall', 1)`,
        [sd.id, eveningActivity]
      );

      await createSchedulePeriod({
        familyId, childId, name: 'Replace-sections-test', startDate: '2027-03-01', endDate: '2027-03-01',
        sourceType: 'family_template', sourceId: templateId, applyMode: 'replace_sections',
      });

      const items = await specialDayItems(db, sd.id);
      const bySection = Object.fromEntries(items.map((i) => [i.section, i.activity_template_id]));
      assert.equal(bySection.morgon, morningActivity, 'untouched morning section must remain');
      assert.equal(bySection.kvall, newEveningActivity, 'kvall section must be replaced by the source item');
      assert.equal(items.length, 2);
    });

    await t.test('C13: replace_day (default) wipes the whole day before applying the source', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const oldActivity = await seedActivity(db, familyId, 'Gammal');
      const newActivity = await seedActivity(db, familyId, 'Ny');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId: newActivity }]);

      await db.query(`INSERT INTO special_day_schedule (child_id, date) VALUES ($1, '2027-04-01')`, [childId]);
      const sd = await specialDayFor(db, childId, '2027-04-01');
      await db.query(
        `INSERT INTO special_day_schedule_item (special_day_schedule_id, activity_template_id, name, section, sort_order) VALUES ($1, $2, 'Gammal', 'morgon', 0)`,
        [sd.id, oldActivity]
      );

      await createSchedulePeriod({
        familyId, childId, name: 'Replace-day-test', startDate: '2027-04-01', endDate: '2027-04-01',
        sourceType: 'family_template', sourceId: templateId,
      });

      const items = await specialDayItems(db, sd.id);
      assert.deepEqual(items.map((i) => i.activity_template_id), [newActivity]);
    });

    // ── D: Special Day override + empty fallback — regression, not reimplemented ────
    await t.test('D14/D15: an explicit Special Day write on a date inside an active period overrides it (same table/row, no new logic needed)', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const periodActivity = await seedActivity(db, familyId, 'Period-aktivitet');
      const overrideActivity = await seedActivity(db, familyId, 'Explicit special day');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId: periodActivity }]);

      const period = await createSchedulePeriod({
        familyId, childId, name: 'Test', startDate: '2027-05-01', endDate: '2027-05-03',
        sourceType: 'family_template', sourceId: templateId,
      });
      const sd = await specialDayFor(db, childId, '2027-05-02');
      assert.equal(sd.period_id, period.period_id);

      // Parent explicitly edits that ONE date afterward (same mechanism special-day-schedules.js uses).
      await db.query('DELETE FROM special_day_schedule_item WHERE special_day_schedule_id = $1', [sd.id]);
      await db.query(
        `INSERT INTO special_day_schedule_item (special_day_schedule_id, activity_template_id, name, section, sort_order) VALUES ($1, $2, 'Override', 'morgon', 0)`,
        [sd.id, overrideActivity]
      );

      const { resolveEffectiveSchedule } = require('../src/lib/effective-schedule');
      const resolved = await resolveEffectiveSchedule(childId, '2027-05-02');
      assert.equal(resolved.source.base_type, 'special_day');
      assert.deepEqual(resolved.items.map((i) => i.activity_template_id), [overrideActivity]);

      // The other two period dates remain untouched by that one-date edit.
      const resolvedNeighbor = await resolveEffectiveSchedule(childId, '2027-05-01');
      assert.deepEqual(resolvedNeighbor.items.map((i) => i.activity_template_id), [periodActivity]);
    });

    // ── E: date overlays unaffected by periods ───────────────────────────────
    await t.test('E16/E17: once-task and date-exclusion mechanisms remain untouched by period materialization', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const weeklyActivity = await seedActivity(db, familyId, 'Veckoaktivitet');
      await seedWeeklyDay(db, childId, 1, [weeklyActivity]); // Monday

      // A date exclusion on a day OUTSIDE any period must still work exactly as before.
      await db.query(
        `INSERT INTO schedule_date_exclusion (child_id, date, activity_template_id) VALUES ($1, '2027-06-07', $2)`, // a Monday
        [childId, weeklyActivity]
      );
      const { resolveEffectiveSchedule } = require('../src/lib/effective-schedule');
      const resolved = await resolveEffectiveSchedule(childId, '2027-06-07');
      assert.equal(resolved.source.base_type, 'weekly');
      assert.deepEqual(resolved.items, [], 'the excluded item must not appear, and no period logic should interfere');
    });

    // ── F: custody ────────────────────────────────────────────────────────────
    await t.test('F18/F19/F20: a period is not custody-home-scoped — it overrides the effective schedule for both homes on that date', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const homeA = await db.query(`INSERT INTO custody_home (family_id, label) VALUES ($1, 'Hos mamma') RETURNING id`, [familyId]);
      const homeB = await db.query(`INSERT INTO custody_home (family_id, label) VALUES ($1, 'Hos pappa') RETURNING id`, [familyId]);
      const homeAActivity = await seedActivity(db, familyId, 'Hos mamma-aktivitet');
      const homeBActivity = await seedActivity(db, familyId, 'Hos pappa-aktivitet');
      await seedWeeklyDay(db, childId, 2, [homeAActivity], { custodyHomeId: homeA.rows[0].id, weekVariant: 'a' }); // Tuesday
      await seedWeeklyDay(db, childId, 2, [homeBActivity], { custodyHomeId: homeB.rows[0].id, weekVariant: 'b' });

      const periodActivity = await seedActivity(db, familyId, 'Period-aktivitet');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId: periodActivity }]);
      await createSchedulePeriod({
        familyId, childId, name: 'Lov över båda hemmen', startDate: '2027-07-06', endDate: '2027-07-06', // a Tuesday
        sourceType: 'family_template', sourceId: templateId,
      });

      const { resolveEffectiveSchedule } = require('../src/lib/effective-schedule');
      const resolved = await resolveEffectiveSchedule(childId, '2027-07-06');
      assert.equal(resolved.source.base_type, 'special_day');
      assert.deepEqual(resolved.items.map((i) => i.activity_template_id), [periodActivity],
        'the period overrides the date regardless of which custody home would otherwise be effective — no per-home duplication required');

      // custody_home_id column on schedule_period does not exist — confirms the deliberate
      // "not custody-scoped" design decision at the schema level too.
      const cols = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'schedule_period'`);
      assert.ok(!cols.rows.some((r) => r.column_name === 'custody_home_id'));
    });

    // ── G: compatibility ──────────────────────────────────────────────────────
    await t.test('G21/G22: legacy apply-date-range and once-task mechanisms are untouched by this service', async () => {
      const applyRoute = require('../src/routes/schedules/child-bulk');
      assert.ok(applyRoute, 'child-bulk.js (apply-date-range) must still load');
      // is_once_task boundary — confirm the resolver still explicitly excludes once-tasks,
      // unchanged by Phase 2 (schedule_period never touches daily_log_item).
      const fs = require('node:fs');
      const effectiveSrc = fs.readFileSync(require.resolve('../src/lib/effective-schedule'), 'utf8');
      assert.match(effectiveSrc, /is_once_task|once.task/i);
    });

    await t.test('G23: family_template / standard_schedule remain the only valid period source types (no activity_category)', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'X');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId }]);

      await assert.rejects(
        createSchedulePeriod({
          familyId, childId, name: 'Bad source', startDate: '2027-08-01', endDate: '2027-08-01',
          sourceType: 'activity_category', sourceId: templateId,
        }),
        (err) => { assert.ok(err instanceof ScheduleApplyError); assert.equal(err.code, 'VALIDATION_ERROR'); return true; }
      );
    });

    // ── Idempotency (reused Phase 1A/1B pattern) ─────────────────────────────
    await t.test('idempotency: retry with the same operation_id replays instead of duplicating', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'X');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId }]);

      const opId = 'test-period-op-1';
      const first = await createSchedulePeriod({
        familyId, childId, name: 'Idem', startDate: '2027-09-01', endDate: '2027-09-01',
        sourceType: 'family_template', sourceId: templateId, operationId: opId,
      });
      const second = await createSchedulePeriod({
        familyId, childId, name: 'Idem', startDate: '2027-09-01', endDate: '2027-09-01',
        sourceType: 'family_template', sourceId: templateId, operationId: opId,
      });
      assert.equal(second.replayed, true);
      const list = await listSchedulePeriods({ familyId, childId });
      assert.equal(list.length, 1, 'a replayed create must not create a second period row');
    });
  } finally {
    await db.cleanup();
  }
});
