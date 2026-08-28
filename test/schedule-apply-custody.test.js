'use strict';

/**
 * Phase 1B custody hardening (PR #1095 review) — "what the parent sees is what the parent
 * edits". Verifies every canonical Phase 1B command scopes its read/write to the active
 * custody_home_id when supplied, that custody_home_id is validated against the family before
 * any mutation, and that non-custody children are completely unaffected.
 *
 * Require-order note: same as test/schedule-apply.test.js — src/lib/schedule-apply.js uses the
 * src/lib/db.js singleton pool, so it must be required lazily, inside the test body, AFTER
 * setupTestDb() has pointed DATABASE_URL at the test database.
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

async function seedCustodyHome(db, familyId, label) {
  const res = await db.query(
    `INSERT INTO custody_home (family_id, label) VALUES ($1, $2) RETURNING id`,
    [familyId, label]
  );
  return res.rows[0].id;
}

// week_variant must accompany custody_home_id when seeding directly via SQL — the unique index
// idx_weekly_schedule_child_dow_variant keys on (child_id, day_of_week, COALESCE(week_variant,
// 'legacy')), so two custody homes for the same child+day both need a DISTINCT week_variant
// to coexist (mirrors src/routes/schedules/child-crud.js's real create path).
async function seedWeeklyDay(db, childId, dayOfWeek, activityIds, { section = 'morgon', custodyHomeId = null, weekVariant = null } = {}) {
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
       VALUES ($1, $2, $3, $4)`,
      [sched.rows[0].id, activityId, sortOrder++, section]
    );
  }
  return sched.rows[0].id;
}

/** activity_template_ids for a child/day, optionally scoped to a specific custody_home_id
 *  (or explicitly the generic/no-home row when custodyHomeId is undefined). */
async function itemsFor(db, childId, dayOfWeek, custodyHomeId) {
  const sql = custodyHomeId === undefined
    ? `SELECT wsi.activity_template_id FROM weekly_schedule_item wsi
       JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
       WHERE ws.child_id = $1 AND ws.day_of_week = $2 AND ws.custody_home_id IS NULL
       ORDER BY wsi.sort_order ASC`
    : `SELECT wsi.activity_template_id FROM weekly_schedule_item wsi
       JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
       WHERE ws.child_id = $1 AND ws.day_of_week = $2 AND ws.custody_home_id = $3
       ORDER BY wsi.sort_order ASC`;
  const params = custodyHomeId === undefined ? [childId, dayOfWeek] : [childId, dayOfWeek, custodyHomeId];
  const res = await db.query(sql, params);
  return res.rows.map((r) => r.activity_template_id);
}

test('Phase 1B custody hardening', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const {
    applyActivityToChild, applyScheduleSourceToChildPlan, copyScheduleDay, saveWeeklyDayAsFamilyTemplate,
    ScheduleApplyError,
  } = require('../src/lib/schedule-apply');

  try {
    // ── C12: apply activity to home A ────────────────────────────────────────────
    await t.test('apply-activity to home A changes only home A — generic and home B unchanged', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const homeA = await seedCustodyHome(db, familyId, 'Hos mamma');
      const homeB = await seedCustodyHome(db, familyId, 'Hos pappa');
      const activityId = await seedActivity(db, familyId, 'Tänder');

      const result = await applyActivityToChild({
        familyId, childId, activityTemplateId: activityId, days: [1],
        custodyContext: { custodyHomeId: homeA },
      });

      assert.deepEqual(result.applied_days, [1]);
      assert.deepEqual(await itemsFor(db, childId, 1, homeA), [activityId]);
      assert.deepEqual(await itemsFor(db, childId, 1, homeB), []);
      assert.deepEqual(await itemsFor(db, childId, 1, undefined), []);
    });

    // ── C13: apply source (template) to home A ───────────────────────────────────
    await t.test('apply-source to home A only changes home A', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const homeA = await seedCustodyHome(db, familyId, 'Hos mamma');
      const homeB = await seedCustodyHome(db, familyId, 'Hos pappa');
      const activityId = await seedActivity(db, familyId, 'Frukost');
      const tpl = await db.query(
        `INSERT INTO weekly_schedule (family_id, name, sort_order, day_of_week, child_id) VALUES ($1, 'Mall', 0, 0, NULL) RETURNING id`,
        [familyId]
      );
      await db.query(
        `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section) VALUES ($1, $2, 0, 'morgon')`,
        [tpl.rows[0].id, activityId]
      );

      const result = await applyScheduleSourceToChildPlan({
        familyId, childId, sourceType: 'family_template', sourceId: tpl.rows[0].id,
        targets: [{ dayOfWeek: 2, mode: 'merge' }],
        custodyContext: { custodyHomeId: homeA },
      });

      assert.deepEqual(result.applied_days, [2]);
      assert.deepEqual(await itemsFor(db, childId, 2, homeA), [activityId]);
      assert.deepEqual(await itemsFor(db, childId, 2, homeB), []);
      assert.deepEqual(await itemsFor(db, childId, 2, undefined), []);
    });

    // ── C14: replace_day in home A never wipes home B or the generic schedule ───
    await t.test('replace_day in home A does not wipe home B or the generic schedule', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const homeA = await seedCustodyHome(db, familyId, 'Hos mamma');
      const homeB = await seedCustodyHome(db, familyId, 'Hos pappa');
      const oldA = await seedActivity(db, familyId, 'Gammal A');
      const bItem = await seedActivity(db, familyId, 'B-aktivitet');
      const genericItem = await seedActivity(db, familyId, 'Generisk');
      await seedWeeklyDay(db, childId, 3, [oldA], { custodyHomeId: homeA, weekVariant: 'a' });
      await seedWeeklyDay(db, childId, 3, [bItem], { custodyHomeId: homeB, weekVariant: 'b' });
      await seedWeeklyDay(db, childId, 3, [genericItem]); // no custody home at all

      const newA = await seedActivity(db, familyId, 'Ny A');
      await applyActivityToChild({
        familyId, childId, activityTemplateId: newA, days: [3], mode: 'replace_day',
        custodyContext: { custodyHomeId: homeA },
      });

      assert.deepEqual(await itemsFor(db, childId, 3, homeA), [newA], 'home A fully replaced');
      assert.deepEqual(await itemsFor(db, childId, 3, homeB), [bItem], 'home B untouched');
      assert.deepEqual(await itemsFor(db, childId, 3, undefined), [genericItem], 'generic schedule untouched');
    });

    // ── C15: copy Monday -> Tuesday within home A ────────────────────────────────
    await t.test('copy day within home A reads/writes home A only', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const homeA = await seedCustodyHome(db, familyId, 'Hos mamma');
      const homeB = await seedCustodyHome(db, familyId, 'Hos pappa');
      const aMonday = await seedActivity(db, familyId, 'A Måndag');
      const bMonday = await seedActivity(db, familyId, 'B Måndag'); // decoy on home B's Monday
      await seedWeeklyDay(db, childId, 1, [aMonday], { custodyHomeId: homeA, weekVariant: 'a' });
      await seedWeeklyDay(db, childId, 1, [bMonday], { custodyHomeId: homeB, weekVariant: 'b' });

      const result = await copyScheduleDay({
        familyId, sourceChildId: childId, sourceDayOfWeek: 1, targetChildId: childId, targetDays: [2],
        custodyContext: { custodyHomeId: homeA },
      });

      assert.deepEqual(result.applied_days, [2]);
      assert.deepEqual(await itemsFor(db, childId, 2, homeA), [aMonday], 'Tuesday home A gets Monday home A content, not home B');
      assert.deepEqual(await itemsFor(db, childId, 2, homeB), [], 'home B Tuesday untouched');
      assert.deepEqual(await itemsFor(db, childId, 2, undefined), [], 'generic Tuesday untouched');
    });

    // ── C16: save Monday as template while editing home A ────────────────────────
    await t.test('save-as-template while editing home A snapshots home A content, template stays custody-neutral', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const homeA = await seedCustodyHome(db, familyId, 'Hos mamma');
      const aItem = await seedActivity(db, familyId, 'A-aktivitet');
      const genericItem = await seedActivity(db, familyId, 'Generisk aktivitet');
      await seedWeeklyDay(db, childId, 1, [aItem], { custodyHomeId: homeA, weekVariant: 'a' });
      await seedWeeklyDay(db, childId, 1, [genericItem]); // generic Monday, different content

      const result = await saveWeeklyDayAsFamilyTemplate({
        familyId, childId, dayOfWeek: 1, templateName: 'Mammas morgon',
        custodyContext: { custodyHomeId: homeA },
      });

      const templateItems = await db.query(
        `SELECT activity_template_id FROM weekly_schedule_item WHERE weekly_schedule_id = $1`,
        [result.template_id]
      );
      assert.deepEqual(templateItems.rows.map((r) => r.activity_template_id), [aItem], 'template captured home A content, not the generic Monday');

      const templateRow = await db.query(`SELECT custody_home_id, child_id FROM weekly_schedule WHERE id = $1`, [result.template_id]);
      assert.equal(templateRow.rows[0].custody_home_id, null, 'the created template itself must remain custody-neutral');
      assert.equal(templateRow.rows[0].child_id, null, 'a real family_template row, not a repurposed child row');
    });

    // ── C17: foreign-family custody_home_id is denied, no writes ─────────────────
    await t.test('foreign-family custody_home_id is denied for every command, no writes', async () => {
      const { familyId: familyA, childId: childA } = await createTestFamilyWithChild(db);
      const { familyId: familyB } = await createTestFamilyWithChild(db);
      const homeB = await seedCustodyHome(db, familyB, 'Familj B hem');
      const activityId = await seedActivity(db, familyA, 'Tänder');

      await assert.rejects(
        applyActivityToChild({
          familyId: familyA, childId: childA, activityTemplateId: activityId, days: [1],
          custodyContext: { custodyHomeId: homeB },
        }),
        (err) => {
          assert.ok(err instanceof ScheduleApplyError);
          assert.equal(err.code, 'CUSTODY_HOME_INVALID');
          assert.equal(err.httpStatus, 403);
          return true;
        }
      );
      assert.deepEqual(await itemsFor(db, childA, 1, homeB), []);
      assert.deepEqual(await itemsFor(db, childA, 1, undefined), []);
    });

    // ── C18: unknown custody_home_id is denied, no writes ────────────────────────
    await t.test('unknown/nonexistent custody_home_id is denied deterministically, no writes', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Tänder');
      const bogusHomeId = '00000000-0000-0000-0000-000000000000';

      await assert.rejects(
        applyActivityToChild({
          familyId, childId, activityTemplateId: activityId, days: [1],
          custodyContext: { custodyHomeId: bogusHomeId },
        }),
        (err) => {
          assert.ok(err instanceof ScheduleApplyError);
          assert.equal(err.code, 'CUSTODY_HOME_INVALID');
          return true;
        }
      );
      assert.deepEqual(await itemsFor(db, childId, 1, undefined), []);
    });

    // ── §12: no-custody regression — identical behaviour without custody context ─
    await t.test('no-custody child: identical behaviour, custody_home_id never required', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Frukost');

      const result = await applyActivityToChild({ familyId, childId, activityTemplateId: activityId, days: [1] });

      assert.deepEqual(result.applied_days, [1]);
      assert.deepEqual(await itemsFor(db, childId, 1, undefined), [activityId]);
    });

    // ── copy-day cross-child + custody: source/target family checks still apply ──
    await t.test('copy-day: cross-family target child still denied even with a valid custody_home_id', async () => {
      const { familyId: familyA, childId: childA } = await createTestFamilyWithChild(db);
      const { childId: childB } = await createTestFamilyWithChild(db); // family B
      const homeA = await seedCustodyHome(db, familyA, 'Hos mamma');
      const activityId = await seedActivity(db, familyA, 'A');
      await seedWeeklyDay(db, childA, 1, [activityId], { custodyHomeId: homeA });

      await assert.rejects(
        copyScheduleDay({
          familyId: familyA, sourceChildId: childA, sourceDayOfWeek: 1, targetChildId: childB, targetDays: [1],
          custodyContext: { custodyHomeId: homeA },
        }),
        (err) => {
          assert.ok(err instanceof ScheduleApplyError);
          assert.equal(err.code, 'CHILD_NOT_IN_FAMILY');
          return true;
        }
      );
    });
  } finally {
    await db.cleanup();
  }
});
