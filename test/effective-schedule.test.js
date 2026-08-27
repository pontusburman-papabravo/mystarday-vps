'use strict';

/**
 * Phase 1A — canonical effective-schedule query service (src/lib/effective-schedule.js).
 *
 * Require-order note: same as test/schedule-apply.test.js — effective-schedule.js and
 * daily-log-generator.js use the src/lib/db.js singleton, so they must be required lazily
 * inside the test body, after setupTestDb() has pointed DATABASE_URL at the test database.
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

async function seedWeeklyItem(db, childId, dayOfWeek, activityId, section = 'morgon') {
  const sched = await db.query(
    `INSERT INTO weekly_schedule (child_id, day_of_week, sort_order) VALUES ($1, $2, $3) RETURNING id`,
    [childId, dayOfWeek, dayOfWeek]
  );
  await db.query(
    `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section)
     VALUES ($1, $2, 0, $3)`,
    [sched.rows[0].id, activityId, section]
  );
  return sched.rows[0].id;
}

// A Monday far enough in the future to be deterministic regardless of "today".
const MONDAY = '2027-01-04';
const TUESDAY = '2027-01-05';

test('effective-schedule canonical resolver', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { resolveEffectiveSchedule, BASE_TYPES } = require('../src/lib/effective-schedule');

  try {
    await t.test('ordinary weekly day resolves from weekly_schedule (§28)', async () => {
      const { childId } = await createTestFamilyWithChild(db);
      const { familyId: fam2 } = await createTestFamilyWithChild(db); // noise
      void fam2;
      const activityId = await seedActivity(db, (await db.query('SELECT family_id FROM child WHERE id=$1', [childId])).rows[0].family_id, 'Frukost');
      await seedWeeklyItem(db, childId, 1, activityId); // Monday = day_of_week 1

      const effective = await resolveEffectiveSchedule(childId, MONDAY, { timezone: 'Europe/Stockholm' });

      assert.equal(effective.source.base_type, BASE_TYPES.WEEKLY);
      assert.equal(effective.day_of_week, 1);
      assert.equal(effective.items.length, 1);
      assert.equal(effective.items[0].activity_template_id, activityId);
    });

    await t.test('no weekly schedule and no special day → base_type none, empty items', async () => {
      const { childId } = await createTestFamilyWithChild(db);
      const effective = await resolveEffectiveSchedule(childId, MONDAY, { timezone: 'Europe/Stockholm' });
      assert.equal(effective.source.base_type, BASE_TYPES.NONE);
      assert.deepEqual(effective.items, []);
    });

    await t.test('populated special day takes precedence over weekly (§8, §31)', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const weeklyActivity = await seedActivity(db, familyId, 'Vanlig frukost');
      await seedWeeklyItem(db, childId, 1, weeklyActivity);

      const sd = await db.query(
        `INSERT INTO special_day_schedule (child_id, date) VALUES ($1, $2) RETURNING id`,
        [childId, MONDAY]
      );
      await db.query(
        `INSERT INTO special_day_schedule_item (special_day_schedule_id, name, icon, section, sort_order)
         VALUES ($1, 'Läkarbesök', '🏥', 'dag', 0)`,
        [sd.rows[0].id]
      );

      const effective = await resolveEffectiveSchedule(childId, MONDAY, { timezone: 'Europe/Stockholm' });
      assert.equal(effective.source.base_type, BASE_TYPES.SPECIAL_DAY);
      assert.equal(effective.items.length, 1);
      assert.equal(effective.items[0].name, 'Läkarbesök');
    });

    await t.test('empty special day row falls back to weekly — current live behaviour preserved (§8.1)', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const weeklyActivity = await seedActivity(db, familyId, 'Frukost');
      await seedWeeklyItem(db, childId, 1, weeklyActivity);

      // Special day row exists (e.g. created for a note) but has zero items.
      await db.query(`INSERT INTO special_day_schedule (child_id, date) VALUES ($1, $2)`, [childId, MONDAY]);

      const effective = await resolveEffectiveSchedule(childId, MONDAY, { timezone: 'Europe/Stockholm' });
      assert.equal(effective.source.base_type, BASE_TYPES.WEEKLY, 'must fall back, not return an empty special day');
      assert.equal(effective.items.length, 1);
    });

    await t.test('date exclusion removes only the matching date, not other occurrences (§16)', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Simning');
      await seedWeeklyItem(db, childId, 1, activityId);

      await db.query(
        `INSERT INTO schedule_date_exclusion (child_id, date, activity_template_id) VALUES ($1, $2, $3)`,
        [childId, MONDAY, activityId]
      );

      const excludedDay = await resolveEffectiveSchedule(childId, MONDAY, { timezone: 'Europe/Stockholm' });
      assert.equal(excludedDay.items.length, 0);
      assert.deepEqual(excludedDay.excluded_activity_template_ids, [activityId]);

      // Next Monday (no exclusion row for that date) still has the item.
      const nextMonday = await resolveEffectiveSchedule(childId, '2027-01-11', { timezone: 'Europe/Stockholm' });
      assert.equal(nextMonday.items.length, 1, 'exclusion must not remove the recurring weekly item permanently');
    });

    await t.test('exclusion does not apply to a populated special day (§16 boundary, current behaviour)', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Bad');
      const sd = await db.query(`INSERT INTO special_day_schedule (child_id, date) VALUES ($1, $2) RETURNING id`, [childId, TUESDAY]);
      await db.query(
        `INSERT INTO special_day_schedule_item (special_day_schedule_id, activity_template_id, name, icon, section, sort_order)
         VALUES ($1, $2, 'Bad', '🛁', 'kvall', 0)`,
        [sd.rows[0].id, activityId]
      );
      await db.query(
        `INSERT INTO schedule_date_exclusion (child_id, date, activity_template_id) VALUES ($1, $2, $3)`,
        [childId, TUESDAY, activityId]
      );

      const effective = await resolveEffectiveSchedule(childId, TUESDAY, { timezone: 'Europe/Stockholm' });
      assert.equal(effective.source.base_type, BASE_TYPES.SPECIAL_DAY);
      assert.equal(effective.items.length, 1, 'exclusion rows are weekly-only and must not hide special-day items');
    });

    await t.test('items are sorted by canonical section order morgon→dag→kvall→natt (§17)', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const night = await seedActivity(db, familyId, 'Sova');
      const morning = await seedActivity(db, familyId, 'Vakna');
      const sched = await db.query(`INSERT INTO weekly_schedule (child_id, day_of_week, sort_order) VALUES ($1, 1, 1) RETURNING id`, [childId]);
      await db.query(
        `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section) VALUES ($1, $2, 0, 'natt')`,
        [sched.rows[0].id, night]
      );
      await db.query(
        `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section) VALUES ($1, $2, 0, 'morgon')`,
        [sched.rows[0].id, morning]
      );

      const effective = await resolveEffectiveSchedule(childId, MONDAY, { timezone: 'Europe/Stockholm' });
      assert.deepEqual(effective.items.map((i) => i.activity_template_id), [morning, night]);
    });

    await t.test('resolver is deterministic regardless of item insertion order (§28)', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const a = await seedActivity(db, familyId, 'A');
      const b = await seedActivity(db, familyId, 'B');
      const sched = await db.query(`INSERT INTO weekly_schedule (child_id, day_of_week, sort_order) VALUES ($1, 1, 1) RETURNING id`, [childId]);
      await db.query(`INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section) VALUES ($1, $2, 1, 'dag')`, [sched.rows[0].id, b]);
      await db.query(`INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section) VALUES ($1, $2, 0, 'dag')`, [sched.rows[0].id, a]);

      const first = await resolveEffectiveSchedule(childId, MONDAY, { timezone: 'Europe/Stockholm' });
      const second = await resolveEffectiveSchedule(childId, MONDAY, { timezone: 'Europe/Stockholm' });
      assert.deepEqual(first.items.map((i) => i.activity_template_id), [a, b]);
      assert.deepEqual(second.items.map((i) => i.activity_template_id), [a, b]);
    });

    await t.test('exclusion honoured on first-ever generation via daily-log-generator (§9, gap closed)', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Simning');
      await seedWeeklyItem(db, childId, 1, activityId);
      await db.query(
        `INSERT INTO schedule_date_exclusion (child_id, date, activity_template_id) VALUES ($1, $2, $3)`,
        [childId, MONDAY, activityId]
      );

      const { getOrGenerateDailyLog } = require('../src/lib/daily-log-generator');
      const { items, generated } = await getOrGenerateDailyLog(childId, MONDAY);
      assert.equal(generated, true);
      assert.deepEqual(items.map((i) => i.activity_template_id), [], 'excluded item must not appear on first-ever generation');
    });

    await t.test('daily-log generation for an ordinary day still includes weekly items (regression)', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Frukost');
      await seedWeeklyItem(db, childId, 1, activityId);

      const { getOrGenerateDailyLog } = require('../src/lib/daily-log-generator');
      const { items, generated } = await getOrGenerateDailyLog(childId, MONDAY);
      assert.equal(generated, true);
      assert.equal(items.length, 1);
      assert.equal(items[0].activity_template_id, activityId);
    });

    await t.test('daily-log generation for a populated special day still works (regression)', async () => {
      const { childId } = await createTestFamilyWithChild(db);
      const sd = await db.query(`INSERT INTO special_day_schedule (child_id, date) VALUES ($1, $2) RETURNING id`, [childId, MONDAY]);
      await db.query(
        `INSERT INTO special_day_schedule_item (special_day_schedule_id, name, icon, section, sort_order)
         VALUES ($1, 'Läkarbesök', '🏥', 'dag', 0)`,
        [sd.rows[0].id]
      );

      const { getOrGenerateDailyLog } = require('../src/lib/daily-log-generator');
      const { items, generated, from_special_day: fromSpecialDay } = await getOrGenerateDailyLog(childId, MONDAY);
      assert.equal(generated, true);
      assert.equal(fromSpecialDay, true);
      assert.equal(items.length, 1);
      assert.equal(items[0].name, 'Läkarbesök');
    });
  } finally {
    await db.cleanup();
  }
});
