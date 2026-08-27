'use strict';

/**
 * PR #1093 hardening review — regression tests for:
 *   1. single-transaction atomicity for mixed merge/replace_day legacy-route plans
 *      (applyScheduleSourceToChildPlan)
 *   2. idempotency command fingerprint (same operation_id + different command → 409, no mutation)
 *   3. concurrency-safe idempotency (two concurrent identical requests → mutate exactly once)
 *   4. family/child integrity enforced INSIDE the canonical transaction
 *
 * Require-order note: same as test/schedule-apply.test.js — src/lib/schedule-apply.js uses the
 * src/lib/db.js singleton pool, so it (and anything that requires it) must be required lazily,
 * inside the test body, AFTER setupTestDb() has pointed DATABASE_URL at the test database.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const {
  createTestFamilyWithChild,
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
    `SELECT wsi.activity_template_id, wsi.section
     FROM weekly_schedule_item wsi
     JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
     WHERE ws.child_id = $1 AND ws.day_of_week = $2
     ORDER BY wsi.sort_order ASC`,
    [childId, dayOfWeek]
  );
  return res.rows;
}

test('schedule-apply hardening — atomicity, fingerprint, concurrency, family integrity', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const {
    applyScheduleSourceToChildPlan,
    ScheduleApplyError,
  } = require('../src/lib/schedule-apply');

  try {
    // ── §2: single-transaction atomicity for mixed merge/replace_day plans ──────────

    await t.test('A. mixed empty + populated days + overwrite=true apply atomically in one call', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const oldEvening = await seedActivity(db, familyId, 'Gammal kvällsrutin');
      const populatedTplId = await seedFamilyTemplate(db, familyId, [{ activityId: oldEvening, section: 'kvall' }]);
      await applyScheduleSourceToChildPlan({
        familyId, childId, sourceType: 'family_template', sourceId: populatedTplId,
        targets: [{ dayOfWeek: 2, mode: 'merge' }],
      });

      const newActivity = await seedActivity(db, familyId, 'Ny aktivitet');
      const mixedTplId = await seedFamilyTemplate(db, familyId, [{ activityId: newActivity, section: 'morgon' }]);

      const result = await applyScheduleSourceToChildPlan({
        familyId, childId, sourceType: 'family_template', sourceId: mixedTplId,
        targets: [
          { dayOfWeek: 1, mode: 'merge' },
          { dayOfWeek: 2, mode: 'replace_day' },
          { dayOfWeek: 3, mode: 'merge' },
        ],
      });

      assert.deepEqual(result.applied_days, [1, 2, 3]);
      assert.deepEqual((await weeklyItemRows(db, childId, 1)).map((r) => r.activity_template_id), [newActivity]);
      assert.deepEqual((await weeklyItemRows(db, childId, 2)).map((r) => r.activity_template_id), [newActivity], 'day 2 replaced, old evening activity gone');
      assert.deepEqual((await weeklyItemRows(db, childId, 3)).map((r) => r.activity_template_id), [newActivity]);
    });

    await t.test('B/C. forced failure on a LATER target rolls back an EARLIER target already written in the same transaction', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Frukost');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId, section: 'morgon' }]);

      // Day 2 already has a plain (non-custody) schedule row. weekly_schedule has a unique
      // index on (child_id, day_of_week, COALESCE(week_variant, 'legacy')) — since the
      // custody_home_id write path never sets week_variant, requesting day 2 under a real
      // custody_home_id still collides with that existing 'legacy' row, forcing a UNIQUE
      // violation specifically on day 2, AFTER day 1 (processed first, no pre-existing row)
      // has already been written inside the same transaction.
      await applyScheduleSourceToChildPlan({
        familyId, childId, sourceType: 'family_template', sourceId: templateId,
        targets: [{ dayOfWeek: 2, mode: 'merge' }],
      });
      assert.equal((await weeklyItemRows(db, childId, 2)).length, 1, 'setup: day 2 pre-populated');

      const homeRes = await db.query(
        `INSERT INTO custody_home (family_id, label) VALUES ($1, 'Hem A') RETURNING id`,
        [familyId]
      );
      const customHomeId = homeRes.rows[0].id;

      await assert.rejects(
        applyScheduleSourceToChildPlan({
          familyId, childId, sourceType: 'family_template', sourceId: templateId,
          targets: [
            { dayOfWeek: 1, mode: 'merge' }, // no pre-existing row — inserts successfully first
            { dayOfWeek: 2, mode: 'merge' }, // collides with the pre-existing 'legacy' row — fails
          ],
          custodyContext: { custodyHomeId: customHomeId },
        }),
        (err) => {
          assert.equal(err.code, '23505', `expected a unique-violation, got: ${err.code} ${err.message}`);
          return true;
        }
      );

      assert.equal((await weeklyItemRows(db, childId, 1)).length, 0, 'day 1 — written earlier in the SAME failed transaction — must roll back too');
      assert.equal((await weeklyItemRows(db, childId, 2)).length, 1, 'day 2 must still be exactly the pre-existing (unrelated) row, untouched by the failed attempt');
    });

    await t.test('D. standard_schedule materialization rolls back with the same transaction on a later-day failure', async () => {
      const { seedCanonicalLibrary } = require('./helpers/canonical-library-fixture.js');
      const client = await db.pool.connect();
      let scheduleId;
      try {
        await seedCanonicalLibrary(client);
        const res = await client.query(`SELECT id FROM default_schedule WHERE canonical_id = 'morning_routine' LIMIT 1`);
        scheduleId = res.rows[0].id;
      } finally {
        client.release();
      }
      const { familyId, childId } = await createTestFamilyWithChild(db);

      const beforeActivities = await db.query('SELECT COUNT(*)::int AS n FROM activity_template WHERE family_id = $1', [familyId]);

      await assert.rejects(
        applyScheduleSourceToChildPlan({
          familyId, childId, sourceType: 'standard_schedule', sourceId: scheduleId,
          targets: [
            { dayOfWeek: 1, mode: 'merge' },
            { dayOfWeek: 2, mode: 'replace_day' },
          ],
          custodyContext: { custodyHomeId: '00000000-0000-0000-0000-000000000000' },
        })
      );

      const afterActivities = await db.query('SELECT COUNT(*)::int AS n FROM activity_template WHERE family_id = $1', [familyId]);
      assert.equal(afterActivities.rows[0].n, beforeActivities.rows[0].n, 'materialized activity_template rows must roll back too — same transaction');
      assert.equal((await weeklyItemRows(db, childId, 1)).length, 0);
    });

    // ── §3A: command fingerprint ─────────────────────────────────────────────────

    await t.test('1. same operation_id + same command replays the stored result', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Frukost');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId, section: 'morgon' }]);
      const operationId = `fp-replay-${Date.now()}`;
      const call = () => applyScheduleSourceToChildPlan({
        familyId, childId, sourceType: 'family_template', sourceId: templateId,
        targets: [{ dayOfWeek: 1, mode: 'merge' }], operationId,
      });

      const first = await call();
      assert.equal(first.replayed, false);
      const second = await call();
      assert.equal(second.replayed, true);
      assert.deepEqual(second.applied_days, first.applied_days);
      assert.equal((await weeklyItemRows(db, childId, 1)).length, 1);
    });

    await t.test('2. same operation_id + different source → 409 IDEMPOTENCY_KEY_REUSED, no mutation', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityA = await seedActivity(db, familyId, 'A');
      const activityB = await seedActivity(db, familyId, 'B');
      const templateA = await seedFamilyTemplate(db, familyId, [{ activityId: activityA, section: 'morgon' }]);
      const templateB = await seedFamilyTemplate(db, familyId, [{ activityId: activityB, section: 'morgon' }]);
      const operationId = `fp-diff-source-${Date.now()}`;

      await applyScheduleSourceToChildPlan({
        familyId, childId, sourceType: 'family_template', sourceId: templateA,
        targets: [{ dayOfWeek: 1, mode: 'merge' }], operationId,
      });

      await assert.rejects(
        applyScheduleSourceToChildPlan({
          familyId, childId, sourceType: 'family_template', sourceId: templateB,
          targets: [{ dayOfWeek: 1, mode: 'merge' }], operationId,
        }),
        (err) => {
          assert.ok(err instanceof ScheduleApplyError);
          assert.equal(err.httpStatus, 409);
          assert.equal(err.code, 'IDEMPOTENCY_KEY_REUSED');
          return true;
        }
      );

      const rows = await weeklyItemRows(db, childId, 1);
      assert.deepEqual(rows.map((r) => r.activity_template_id), [activityA], 'the conflicting call must not mutate anything');
    });

    await t.test('3. same operation_id + different days → 409, no mutation', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Frukost');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId, section: 'morgon' }]);
      const operationId = `fp-diff-days-${Date.now()}`;

      await applyScheduleSourceToChildPlan({
        familyId, childId, sourceType: 'family_template', sourceId: templateId,
        targets: [{ dayOfWeek: 1, mode: 'merge' }], operationId,
      });

      await assert.rejects(
        applyScheduleSourceToChildPlan({
          familyId, childId, sourceType: 'family_template', sourceId: templateId,
          targets: [{ dayOfWeek: 1, mode: 'merge' }, { dayOfWeek: 2, mode: 'merge' }], operationId,
        }),
        (err) => {
          assert.ok(err instanceof ScheduleApplyError);
          assert.equal(err.httpStatus, 409);
          return true;
        }
      );
      assert.equal((await weeklyItemRows(db, childId, 2)).length, 0, 'day 2 must not have been touched');
    });

    await t.test('4. same operation_id + different mode → 409, no mutation', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Frukost');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId, section: 'morgon' }]);
      const operationId = `fp-diff-mode-${Date.now()}`;

      await applyScheduleSourceToChildPlan({
        familyId, childId, sourceType: 'family_template', sourceId: templateId,
        targets: [{ dayOfWeek: 1, mode: 'merge' }], operationId,
      });

      await assert.rejects(
        applyScheduleSourceToChildPlan({
          familyId, childId, sourceType: 'family_template', sourceId: templateId,
          targets: [{ dayOfWeek: 1, mode: 'replace_day' }], operationId,
        }),
        (err) => {
          assert.ok(err instanceof ScheduleApplyError);
          assert.equal(err.httpStatus, 409);
          return true;
        }
      );
      const rows = await weeklyItemRows(db, childId, 1);
      assert.equal(rows.length, 1, 'the destructive replace_day retry must never have executed');
    });

    // ── §3B: concurrency ──────────────────────────────────────────────────────────

    await t.test('5/6. two concurrent identical requests mutate exactly once', async () => {
      const { familyId, childId } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyId, 'Frukost');
      const templateId = await seedFamilyTemplate(db, familyId, [{ activityId, section: 'morgon' }]);
      const operationId = `fp-concurrent-${Date.now()}`;

      const call = () => applyScheduleSourceToChildPlan({
        familyId, childId, sourceType: 'family_template', sourceId: templateId,
        targets: [{ dayOfWeek: 1, mode: 'merge' }], operationId,
      });

      const [a, b] = await Promise.all([call(), call()]);
      const replayCount = [a.replayed, b.replayed].filter(Boolean).length;
      assert.equal(replayCount, 1, 'exactly one of the two concurrent calls must be the replay');

      const rows = await weeklyItemRows(db, childId, 1);
      assert.equal(rows.length, 1, 'concurrent identical retries must mutate exactly once — no duplicate items');
    });

    // ── §4: child/family integrity enforced inside the canonical service ────────────

    await t.test('canonical service denies cross-family child even if caller supplies familyId=A, source=A, childId=B', async () => {
      const { familyId: familyA } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyA, 'Frukost');
      const templateA = await seedFamilyTemplate(db, familyA, [{ activityId, section: 'morgon' }]);
      const { childId: childB } = await createTestFamilyWithChild(db); // family B

      await assert.rejects(
        applyScheduleSourceToChildPlan({
          familyId: familyA, childId: childB, sourceType: 'family_template', sourceId: templateA,
          targets: [{ dayOfWeek: 1, mode: 'merge' }],
        }),
        (err) => {
          assert.ok(err instanceof ScheduleApplyError);
          assert.equal(err.httpStatus, 403);
          assert.equal(err.code, 'CHILD_NOT_IN_FAMILY');
          return true;
        }
      );

      assert.equal((await weeklyItemRows(db, childB, 1)).length, 0, 'child B must be completely unchanged');
    });

    await t.test('standard_schedule cannot be applied cross-family through the same mistake', async () => {
      const { seedCanonicalLibrary } = require('./helpers/canonical-library-fixture.js');
      const client = await db.pool.connect();
      let scheduleId;
      try {
        await seedCanonicalLibrary(client);
        const res = await client.query(`SELECT id FROM default_schedule WHERE canonical_id = 'morning_routine' LIMIT 1`);
        scheduleId = res.rows[0].id;
      } finally {
        client.release();
      }
      const { familyId: familyA } = await createTestFamilyWithChild(db);
      const { familyId: familyB, childId: childB } = await createTestFamilyWithChild(db);
      const before = await db.query('SELECT COUNT(*)::int AS n FROM activity_template WHERE family_id = $1', [familyB]);

      await assert.rejects(
        applyScheduleSourceToChildPlan({
          familyId: familyA, childId: childB, sourceType: 'standard_schedule', sourceId: scheduleId,
          targets: [{ dayOfWeek: 1, mode: 'merge' }],
        }),
        (err) => {
          assert.ok(err instanceof ScheduleApplyError);
          assert.equal(err.httpStatus, 403);
          assert.equal(err.code, 'CHILD_NOT_IN_FAMILY');
          return true;
        }
      );

      const after = await db.query('SELECT COUNT(*)::int AS n FROM activity_template WHERE family_id = $1', [familyB]);
      assert.equal(after.rows[0].n, before.rows[0].n, 'no activity_template rows materialized under family B');
      assert.equal((await weeklyItemRows(db, childB, 1)).length, 0);
    });

    await t.test('applyScheduleSourceToChild (simple wrapper) also enforces the invariant', async () => {
      const { applyScheduleSourceToChild } = require('../src/lib/schedule-apply');
      const { familyId: familyA } = await createTestFamilyWithChild(db);
      const activityId = await seedActivity(db, familyA, 'Frukost');
      const templateA = await seedFamilyTemplate(db, familyA, [{ activityId, section: 'morgon' }]);
      const { childId: childB } = await createTestFamilyWithChild(db);

      await assert.rejects(
        applyScheduleSourceToChild({
          familyId: familyA, childId: childB, sourceType: 'family_template', sourceId: templateA, days: [1],
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
