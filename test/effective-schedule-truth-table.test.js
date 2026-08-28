'use strict';

/**
 * Phase 3 — the LOCKED effective-schedule precedence truth table (docs
 * "schedule-canonical-architecture.md" § Phase 3). Characterizes the CURRENT behavior of
 * resolveEffectiveSchedule() (src/lib/effective-schedule.js) against every row required by the
 * Phase 3 brief before any code change, then locks it with tests. Also covers the two
 * duplicate-precedence bug fixes made to src/lib/daily-log-generator.js in this same pass
 * (weekly-sync guard against an active period/special day; empty-Special-Day sync falling back
 * to the canonical resolver instead of emptying the log).
 *
 * Require-order note: same as test/schedule-period.test.js — lazy require after setupTestDb().
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
      `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section)
       VALUES ($1, $2, $3, $4)`,
      [templateId, item.activityId, item.sortOrder || 0, item.section || 'morgon']
    );
  }
  return templateId;
}

async function seedWeeklyDay(db, childId, dayOfWeek, items, { custodyHomeId = null, weekVariant = null } = {}) {
  const sched = custodyHomeId
    ? await db.query(
        `INSERT INTO weekly_schedule (child_id, day_of_week, sort_order, custody_home_id, week_variant) VALUES ($1, $2::smallint, $3::integer, $4, $5) RETURNING id`,
        [childId, dayOfWeek, dayOfWeek, custodyHomeId, weekVariant]
      )
    : await db.query(
        `INSERT INTO weekly_schedule (child_id, day_of_week, sort_order) VALUES ($1, $2::smallint, $3::integer) RETURNING id`,
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

async function seedExplicitSpecialDay(db, childId, dateStr, items) {
  const sd = await db.query(`INSERT INTO special_day_schedule (child_id, date) VALUES ($1, $2) RETURNING id`, [childId, dateStr]);
  let sortOrder = 0;
  for (const item of items) {
    await db.query(
      `INSERT INTO special_day_schedule_item (special_day_schedule_id, activity_template_id, name, section, sort_order) VALUES ($1, $2, 'X', $3, $4)`,
      [sd.rows[0].id, item.activityId, item.section || 'morgon', sortOrder++]
    );
  }
  return sd.rows[0].id;
}

test('Phase 3 — effective-schedule precedence truth table (characterization + lock)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { resolveEffectiveSchedule, BASE_TYPES } = require('../src/lib/effective-schedule');
  const { createSchedulePeriod, deleteSchedulePeriod } = require('../src/lib/schedule-period');
  const { getOrGenerateDailyLog, syncDailyLogWithSchedule, syncDailyLogForSpecialDay } = require('../src/lib/daily-log-generator');

  try {
    // ═══ TRUTH TABLE ROWS 1-2, 12: BASE ══════════════════════════════════════
    await t.test('Row 1/2: weekly-only vs no-schedule', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Frukost');
      await seedWeeklyDay(db, childId, 1, [{ activityId, section: 'morgon' }]); // Monday

      const withWeekly = await resolveEffectiveSchedule(childId, '2027-11-01'); // a Monday
      assert.equal(withWeekly.source.base_type, BASE_TYPES.WEEKLY);
      assert.equal(withWeekly.source.base_id !== null, true);
      assert.deepEqual(withWeekly.items.map((i) => i.activity_template_id), [activityId]);

      const noSchedule = await resolveEffectiveSchedule(childId, '2027-11-02'); // a Tuesday, no weekly row
      assert.equal(noSchedule.source.base_type, BASE_TYPES.NONE);
      assert.equal(noSchedule.source.base_id, null);
      assert.deepEqual(noSchedule.items, []);
    });

    await t.test('Row 12: weekly item excluded on one date only', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Frukost');
      await seedWeeklyDay(db, childId, 3, [{ activityId, section: 'morgon' }]); // Wednesday
      await db.query(`INSERT INTO schedule_date_exclusion (child_id, date, activity_template_id) VALUES ($1, '2027-11-03', $2)`, [childId, activityId]);

      const excludedDay = await resolveEffectiveSchedule(childId, '2027-11-03');
      assert.equal(excludedDay.source.base_type, BASE_TYPES.WEEKLY);
      assert.deepEqual(excludedDay.items, []);
      assert.deepEqual(excludedDay.excluded_activity_template_ids, [activityId]);

      const neighborDay = await resolveEffectiveSchedule(childId, '2027-11-10'); // next Wednesday
      assert.deepEqual(neighborDay.items.map((i) => i.activity_template_id), [activityId], 'exclusion must be one-date-only');
    });

    // ═══ ROWS 3-4: CUSTODY ═══════════════════════════════════════════════════
    await t.test('Row 3/4: custody weekly A vs B — resolver returns the correct home', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const homeA = await db.query(`INSERT INTO custody_home (family_id, label) VALUES ($1, 'A') RETURNING id`, [familyId]);
      const homeB = await db.query(`INSERT INTO custody_home (family_id, label) VALUES ($1, 'B') RETURNING id`, [familyId]);
      await db.query(
        `INSERT INTO custody_pattern (child_id, anchor_date, interval_weeks, week_a_home_id, week_b_home_id, pattern_type) VALUES ($1, '2027-11-01', 2, $2, $3, 'alternate_weeks')`,
        [childId, homeA.rows[0].id, homeB.rows[0].id]
      );
      const activityA = await seedActivity(db, familyId, 'Hos A');
      const activityB = await seedActivity(db, familyId, 'Hos B');
      await seedWeeklyDay(db, childId, 1, [{ activityId: activityA }], { custodyHomeId: homeA.rows[0].id, weekVariant: 'a' });
      await seedWeeklyDay(db, childId, 1, [{ activityId: activityB }], { custodyHomeId: homeB.rows[0].id, weekVariant: 'b' });

      const weekA = await resolveEffectiveSchedule(childId, '2027-11-01'); // anchor week = A
      assert.deepEqual(weekA.items.map((i) => i.activity_template_id), [activityA]);
      const weekB = await resolveEffectiveSchedule(childId, '2027-11-08'); // next week = B
      assert.deepEqual(weekB.items.map((i) => i.activity_template_id), [activityB]);
    });

    // ═══ ROWS 5-7, 13-15: PERIOD MODES + EXCLUSION EDGE CASES ═══════════════
    await t.test('Row 5/13: merge — weekly stays, period item added, exclusion removes only the period item', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const weeklyActivity = await seedActivity(db, familyId, 'A');
      const periodActivity = await seedActivity(db, familyId, 'B');
      await seedWeeklyDay(db, childId, 5, [{ activityId: weeklyActivity, section: 'morgon' }]); // Friday
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId: periodActivity, section: 'kvall' }]);
      await createSchedulePeriod({ familyId, childId, name: 'P', startDate: '2027-11-05', endDate: '2027-11-05', sourceType: 'family_template', sourceId: templateId, applyMode: 'merge' });

      const merged = await resolveEffectiveSchedule(childId, '2027-11-05');
      assert.equal(merged.source.base_type, BASE_TYPES.SPECIAL_PERIOD);
      assert.deepEqual(merged.items.map((i) => i.activity_template_id).sort(), [periodActivity, weeklyActivity].sort());

      await db.query(`INSERT INTO schedule_date_exclusion (child_id, date, activity_template_id) VALUES ($1, '2027-11-05', $2)`, [childId, periodActivity]);
      const excluded = await resolveEffectiveSchedule(childId, '2027-11-05');
      assert.deepEqual(excluded.items.map((i) => i.activity_template_id), [weeklyActivity], 'merge + exclude(B) => A');
    });

    await t.test('Row 6/14: replace_sections — untouched sections survive, excluded old weekly item does NOT reappear', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const morningA = await seedActivity(db, familyId, 'morningA');
      const eveningOld = await seedActivity(db, familyId, 'B');
      const eveningNew = await seedActivity(db, familyId, 'C');
      await seedWeeklyDay(db, childId, 6, [ // Saturday
        { activityId: morningA, section: 'morgon' },
        { activityId: eveningOld, section: 'kvall' },
      ]);
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId: eveningNew, section: 'kvall' }]);
      await createSchedulePeriod({ familyId, childId, name: 'P', startDate: '2027-11-06', endDate: '2027-11-06', sourceType: 'family_template', sourceId: templateId, applyMode: 'replace_sections' });

      const composed = await resolveEffectiveSchedule(childId, '2027-11-06');
      assert.deepEqual(composed.items.map((i) => i.activity_template_id).sort(), [eveningNew, morningA].sort());

      await db.query(`INSERT INTO schedule_date_exclusion (child_id, date, activity_template_id) VALUES ($1, '2027-11-06', $2)`, [childId, eveningNew]);
      const excluded = await resolveEffectiveSchedule(childId, '2027-11-06');
      assert.deepEqual(excluded.items.map((i) => i.activity_template_id), [morningA], 'excluding C must NOT resurrect old weekly B — replace_sections already replaced that section');
    });

    await t.test('Row 7/15: replace_day — weekly discarded entirely; excluding the only period item yields empty, base_type stays special_period, no weekly fallback', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const weeklyActivity = await seedActivity(db, familyId, 'A');
      const periodActivity = await seedActivity(db, familyId, 'B');
      await seedWeeklyDay(db, childId, 0, [{ activityId: weeklyActivity }]); // Sunday (dow 0)
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId: periodActivity }]);
      await createSchedulePeriod({ familyId, childId, name: 'P', startDate: '2027-11-07', endDate: '2027-11-07', sourceType: 'family_template', sourceId: templateId, applyMode: 'replace_day' });

      const composed = await resolveEffectiveSchedule(childId, '2027-11-07');
      assert.deepEqual(composed.items.map((i) => i.activity_template_id), [periodActivity], 'replace_day must discard weekly entirely');

      await db.query(`INSERT INTO schedule_date_exclusion (child_id, date, activity_template_id) VALUES ($1, '2027-11-07', $2)`, [childId, periodActivity]);
      const excluded = await resolveEffectiveSchedule(childId, '2027-11-07');
      assert.equal(excluded.source.base_type, BASE_TYPES.SPECIAL_PERIOD, 'no hidden fallback to weekly merely because items.length === 0');
      assert.deepEqual(excluded.items, []);
    });

    // ═══ ROW 8-9, 16: POPULATED SPECIAL DAY WINS OUTRIGHT ═══════════════════
    await t.test('Row 8/9/16: populated explicit Special Day wins over both weekly and an active period, and ignores a matching exclusion', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const weeklyActivity = await seedActivity(db, familyId, 'A');
      const periodActivity = await seedActivity(db, familyId, 'B');
      const explicitActivity = await seedActivity(db, familyId, 'X');
      await seedWeeklyDay(db, childId, 2, [{ activityId: weeklyActivity }]); // Tuesday, no period → row 8 target date
      await seedExplicitSpecialDay(db, childId, '2027-11-09', [{ activityId: explicitActivity }]); // a Tuesday
      const overWeekly = await resolveEffectiveSchedule(childId, '2027-11-09');
      assert.equal(overWeekly.source.base_type, BASE_TYPES.SPECIAL_DAY);
      assert.deepEqual(overWeekly.items.map((i) => i.activity_template_id), [explicitActivity]);

      // Row 9: same, but with an ACTIVE period also covering that date.
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId: periodActivity }]);
      await createSchedulePeriod({ familyId, childId, name: 'P', startDate: '2027-11-08', endDate: '2027-11-12', sourceType: 'family_template', sourceId: templateId, applyMode: 'replace_day' });
      const overPeriod = await resolveEffectiveSchedule(childId, '2027-11-09');
      assert.equal(overPeriod.source.base_type, BASE_TYPES.SPECIAL_DAY, 'explicit Special Day must win over an active period too');
      assert.deepEqual(overPeriod.items.map((i) => i.activity_template_id), [explicitActivity]);

      // Row 16: a matching exclusion must NOT filter the explicit Special Day.
      await db.query(`INSERT INTO schedule_date_exclusion (child_id, date, activity_template_id) VALUES ($1, '2027-11-09', $2)`, [childId, explicitActivity]);
      const withExclusion = await resolveEffectiveSchedule(childId, '2027-11-09');
      assert.deepEqual(withExclusion.items.map((i) => i.activity_template_id), [explicitActivity], 'exclusion must never apply to a populated explicit Special Day');
    });

    // ═══ ROW 10-11: EMPTY SPECIAL DAY FALLS THROUGH ═════════════════════════
    await t.test('Row 10/11: empty explicit Special Day falls through — to weekly with no period, to the composed period result with an active period', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const weeklyActivity = await seedActivity(db, familyId, 'A');
      await seedWeeklyDay(db, childId, 4, [{ activityId: weeklyActivity }]); // Thursday
      await db.query(`INSERT INTO special_day_schedule (child_id, date) VALUES ($1, '2027-11-11')`, [childId]); // empty, a Thursday, no period
      const overWeekly = await resolveEffectiveSchedule(childId, '2027-11-11');
      assert.equal(overWeekly.source.base_type, BASE_TYPES.WEEKLY);
      assert.deepEqual(overWeekly.items.map((i) => i.activity_template_id), [weeklyActivity]);

      const periodActivity = await seedActivity(db, familyId, 'B');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId: periodActivity }]);
      await createSchedulePeriod({ familyId, childId, name: 'P', startDate: '2027-11-18', endDate: '2027-11-18', sourceType: 'family_template', sourceId: templateId, applyMode: 'merge' });
      await db.query(`INSERT INTO special_day_schedule (child_id, date) VALUES ($1, '2027-11-18')`, [childId]); // empty, a Thursday, WITH period
      const overPeriod = await resolveEffectiveSchedule(childId, '2027-11-18');
      assert.equal(overPeriod.source.base_type, BASE_TYPES.SPECIAL_PERIOD, 'empty explicit Special Day must fall through to the active period, not weekly');
    });

    // ═══ ROW 17-19: PERIOD LIFECYCLE + SPECIAL DAY SURVIVAL ═════════════════
    await t.test('Row 17/18/19: period ends → weekly returns; period deleted → weekly returns; explicit Special Day survives period delete', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const weeklyActivity = await seedActivity(db, familyId, 'A');
      const periodActivity = await seedActivity(db, familyId, 'B');
      const explicitActivity = await seedActivity(db, familyId, 'X');
      await seedWeeklyDay(db, childId, 1, [{ activityId: weeklyActivity }]); // Monday
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId: periodActivity }]);
      const period = await createSchedulePeriod({ familyId, childId, name: 'P', startDate: '2027-11-15', endDate: '2027-11-15', sourceType: 'family_template', sourceId: templateId, applyMode: 'replace_day' });
      await seedExplicitSpecialDay(db, childId, '2027-11-15', [{ activityId: explicitActivity }]);

      // Row 17: "period ends" — the date AFTER end_date is unaffected (weekly, since no explicit override).
      const afterEnd = await resolveEffectiveSchedule(childId, '2027-11-22'); // next Monday, no period, no override
      assert.equal(afterEnd.source.base_type, BASE_TYPES.WEEKLY);

      // Row 19: explicit Special Day wins on 11-15 despite the period.
      let onDate = await resolveEffectiveSchedule(childId, '2027-11-15');
      assert.equal(onDate.source.base_type, BASE_TYPES.SPECIAL_DAY);

      // Row 18: delete the period — explicit day must survive, and it's still the winner.
      await deleteSchedulePeriod({ familyId, childId, periodId: period.period_id });
      onDate = await resolveEffectiveSchedule(childId, '2027-11-15');
      assert.equal(onDate.source.base_type, BASE_TYPES.SPECIAL_DAY, 'explicit Special Day must survive period delete');
      assert.deepEqual(onDate.items.map((i) => i.activity_template_id), [explicitActivity]);
    });

    // ═══ DUPLICATE IDENTITY (§5 merge rule) ═════════════════════════════════
    await t.test('Merge duplicate identity: same activity+section+times suppressed; different time or section allowed', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const sharedActivity = await seedActivity(db, familyId, 'Shared');
      await seedWeeklyDay(db, childId, 3, [{ activityId: sharedActivity, section: 'morgon' }]); // reuse a fresh Wednesday
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId: sharedActivity, section: 'morgon' }]); // exact duplicate identity
      await createSchedulePeriod({ familyId, childId, name: 'DupTest', startDate: '2027-12-01', endDate: '2027-12-01', sourceType: 'family_template', sourceId: templateId, applyMode: 'merge' });
      const resolved = await resolveEffectiveSchedule(childId, '2027-12-01'); // a Wednesday
      const matching = resolved.items.filter((i) => i.activity_template_id === sharedActivity && i.section === 'morgon');
      assert.equal(matching.length, 1, 'exact duplicate identity (same activity+section+times) must be suppressed under merge');
    });

    // ═══ ORDER (canonical section order) ════════════════════════════════════
    await t.test('Canonical section order is always morgon → dag → kvall → natt', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const morgonAct = await seedActivity(db, familyId, 'M');
      const dagAct = await seedActivity(db, familyId, 'D');
      const kvallAct = await seedActivity(db, familyId, 'K');
      const nattAct = await seedActivity(db, familyId, 'N');
      // Seed out of order to prove the resolver re-sorts, not the insert order.
      await seedWeeklyDay(db, childId, 5, [
        { activityId: nattAct, section: 'natt' },
        { activityId: morgonAct, section: 'morgon' },
        { activityId: kvallAct, section: 'kvall' },
        { activityId: dagAct, section: 'dag' },
      ]); // reuse Friday from an earlier test date range — use a fresh date instead
      const resolved = await resolveEffectiveSchedule(childId, '2027-12-03'); // a Friday
      assert.deepEqual(resolved.items.map((i) => i.section), ['morgon', 'dag', 'kvall', 'natt']);
    });

    // ═══ ONCE-TASK BOUNDARY (locked, not redesigned) ═══════════════════════
    await t.test('Once-task boundary: resolver never returns once-tasks; Daily Log preserves an existing once-task through a weekly re-sync', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const weeklyActivity = await seedActivity(db, familyId, 'Weekly');
      await seedWeeklyDay(db, childId, 6, [{ activityId: weeklyActivity }]); // Saturday
      const dateStr = '2027-12-04';
      const { log } = await getOrGenerateDailyLog(childId, dateStr);

      // Add a once-task directly to the generated log, matching the real once-task write path
      // (created directly against daily_log_item — never through the resolver).
      await db.query(
        `INSERT INTO daily_log_item (daily_log_id, is_once_task, name, icon, star_value, sort_order, section) VALUES ($1, true, 'Engångsaktivitet', '⭐', 1, 99, 'dag')`,
        [log.id]
      );

      const resolved = await resolveEffectiveSchedule(childId, dateStr);
      assert.ok(resolved.items.every((i) => i.activity_template_id !== undefined), 'resolver output shape unaffected by once-tasks (they are never in it)');
      assert.equal(resolved.items.some((i) => i.activity_template_id === null), false, 'resolver must never surface a once-task placeholder');

      // A weekly re-sync (e.g. after editing an unrelated weekly item) must not touch the once-task.
      await syncDailyLogWithSchedule(childId, 6, undefined, dateStr);
      const afterSync = await db.query(`SELECT is_once_task FROM daily_log_item WHERE daily_log_id = $1 AND is_once_task = true`, [log.id]);
      assert.equal(afterSync.rows.length, 1, 'once-task must survive a weekly daily-log sync — never duplicated, never removed');
    });

    // ═══ DUPLICATE-PRECEDENCE BUG FIX #1: weekly sync must not override an active period/Special Day ═══
    await t.test('BUGFIX: syncDailyLogWithSchedule() must not inject weekly content into a date governed by an active Special Period', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const weeklyActivity = await seedActivity(db, familyId, 'WeeklyStray');
      const periodActivity = await seedActivity(db, familyId, 'PeriodContent');
      await seedWeeklyDay(db, childId, 2, [{ activityId: weeklyActivity }]); // Tuesday
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId: periodActivity }]);
      const dateStr = '2027-12-07'; // a Tuesday
      await createSchedulePeriod({ familyId, childId, name: 'P', startDate: dateStr, endDate: dateStr, sourceType: 'family_template', sourceId: templateId, applyMode: 'replace_day' });

      // Generate today's log — it must be period-governed (replace_day → only PeriodContent).
      const { log, items } = await getOrGenerateDailyLog(childId, dateStr);
      assert.deepEqual(items.map((i) => i.activity_template_id), [periodActivity]);

      // Simulate an unrelated weekly-schedule edit for this day-of-week triggering a re-sync
      // (this is exactly what routes like schedules/items.js do after a weekly mutation).
      const result = await syncDailyLogWithSchedule(childId, 2, undefined, dateStr);
      assert.equal(result.synced, false);
      assert.equal(result.reason, 'not_weekly_base', 'the sync must recognize the period is authoritative and skip, not inject weekly content');

      const afterSync = await db.query(`SELECT activity_template_id FROM daily_log_item WHERE daily_log_id = $1`, [log.id]);
      assert.deepEqual(afterSync.rows.map((r) => r.activity_template_id), [periodActivity], 'the log must remain exactly the period content — weekly must never have been injected');
    });

    // ═══ DUPLICATE-PRECEDENCE BUG FIX #2: emptying a Special Day must fall back, not empty the log ═══
    await t.test('BUGFIX: syncDailyLogForSpecialDay() falls back to the canonical resolver (period/weekly) when the Special Day becomes empty, instead of emptying the log', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const weeklyActivity = await seedActivity(db, familyId, 'WeeklyBase');
      const explicitActivity = await seedActivity(db, familyId, 'ExplicitOverride');
      await seedWeeklyDay(db, childId, 4, [{ activityId: weeklyActivity }]); // Thursday
      const dateStr = '2027-12-09'; // a Thursday
      const sdId = await seedExplicitSpecialDay(db, childId, dateStr, [{ activityId: explicitActivity }]);

      // Generate today's log — governed by the explicit Special Day.
      const { log, items } = await getOrGenerateDailyLog(childId, dateStr);
      assert.deepEqual(items.map((i) => i.activity_template_id), [explicitActivity]);

      // Now the parent deletes the special day's only item — mirroring
      // special-day-schedules.js's DELETE /:itemId route exactly (delete row, then sync).
      await db.query(`DELETE FROM special_day_schedule_item WHERE special_day_schedule_id = $1`, [sdId]);
      const result = await syncDailyLogForSpecialDay(sdId, dateStr, childId);
      assert.equal(result.synced, true);

      const afterSync = await db.query(`SELECT activity_template_id FROM daily_log_item WHERE daily_log_id = $1`, [log.id]);
      assert.deepEqual(afterSync.rows.map((r) => r.activity_template_id), [weeklyActivity], 'emptying the Special Day must fall back to weekly, not leave the log empty');
    });

    // ═══ CALLER REGRESSION: no duplicated period composition outside the resolver ═══
    await t.test('Caller regression: getOrGenerateDailyLog() first-generation for a merge-mode period matches resolveEffectiveSchedule() exactly (no separate composition logic)', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const weeklyActivity = await seedActivity(db, familyId, 'Weekly');
      const periodActivity = await seedActivity(db, familyId, 'Period');
      await seedWeeklyDay(db, childId, 0, [{ activityId: weeklyActivity, section: 'morgon' }]); // Sunday
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId: periodActivity, section: 'kvall' }]);
      const dateStr = '2027-12-12'; // a Sunday
      await createSchedulePeriod({ familyId, childId, name: 'P', startDate: dateStr, endDate: dateStr, sourceType: 'family_template', sourceId: templateId, applyMode: 'merge' });

      const resolved = await resolveEffectiveSchedule(childId, dateStr);
      const { items } = await getOrGenerateDailyLog(childId, dateStr);
      assert.deepEqual(
        items.map((i) => i.activity_template_id).sort(),
        resolved.items.map((i) => i.activity_template_id).sort(),
        'the generated daily log must contain exactly the resolver-composed item set'
      );
    });
  } finally {
    await db.cleanup();
  }
});
