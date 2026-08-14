'use strict';

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const {
  CanonicalCopyError,
  CANONICAL_VARIANT_REQUIRED,
  CANONICAL_VARIANT_INVALID,
  CANONICAL_DUPLICATE_IDENTITY,
  CANONICAL_SOURCE_INVALID,
  pickLocaleString,
  shouldIncludeOptionalItem,
  copyCanonicalScheduleToFamily,
  copyCanonicalDefaultActivityToFamily,
} = require('../src/lib/canonical-library-copy');
const { setupTestDb } = require('./helpers/setup.js');
const {
  seedCanonicalLibrary,
  createTestFamilyWithChild,
  findScheduleIdByCanonical,
  findDefaultActivityByCanonical,
} = require('./helpers/canonical-library-fixture.js');

describe('canonical library copy engine — unit', () => {
  it('optional contract: omitted selections include optional items (legacy default)', () => {
    assert.equal(shouldIncludeOptionalItem({ is_optional: true, activity_canonical_id: 'homework' }, null), true);
    assert.equal(shouldIncludeOptionalItem({ is_optional: true, activity_canonical_id: 'homework' }, {}), true);
  });

  it('optional contract: explicit false excludes item', () => {
    assert.equal(
      shouldIncludeOptionalItem({ is_optional: true, activity_canonical_id: 'homework' }, { homework: false }),
      false
    );
  });

  it('optional contract: explicit true includes item', () => {
    assert.equal(
      shouldIncludeOptionalItem({ is_optional: true, activity_canonical_id: 'homework' }, { homework: true }),
      true
    );
  });

  it('locale picker prefers en-GB when requested', () => {
    const name = pickLocaleString({ sv: 'Fritids', 'en-GB': 'After-school club' }, 'en-GB', 'fallback');
    assert.equal(name, 'After-school club');
  });
});

describe('canonical library copy engine — DB integration', () => {
  test('matrix A–T (requires DATABASE_URL)', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const client = await db.pool.connect();
    try {
      await db.truncate();
      await seedCanonicalLibrary(client);
      const { familyId, childId } = await createTestFamilyWithChild(db);

      const morningScheduleId = await findScheduleIdByCanonical(db, 'morning_routine');
      const schoolScheduleId = await findScheduleIdByCanonical(db, 'school_weekday');
      const preschoolScheduleId = await findScheduleIdByCanonical(db, 'preschool_weekday');
      assert.ok(morningScheduleId);
      assert.ok(schoolScheduleId);
      assert.ok(preschoolScheduleId);

      // A: basic copy morning_routine
      const morningCopy = await copyCanonicalScheduleToFamily(client, {
        familyId,
        childId,
        canonicalScheduleId: 'morning_routine',
        days: [1],
        locale: 'sv-SE',
      });
      assert.equal(morningCopy.ok, true);
      assert.equal(morningCopy.scheduleCanonicalId, 'morning_routine');
      const weeklyCount = await db.query(
        `SELECT COUNT(*)::int AS count FROM weekly_schedule WHERE child_id = $1`,
        [childId]
      );
      assert.equal(weeklyCount.rows[0].count, 1);

      // B/C: school_weekday full copy + frozen times (requires after_school variant)
      const schoolCopy = await copyCanonicalScheduleToFamily(client, {
        familyId,
        childId,
        canonicalScheduleId: 'school_weekday',
        days: [2],
        variants: { after_school: 'after_school_club' },
        locale: 'sv-SE',
      });
      assert.equal(schoolCopy.ok, true);
      const schoolItems = await db.query(
        `SELECT wsi.start_time, wsi.end_time, at.source_canonical_id
         FROM weekly_schedule_item wsi
         JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
         JOIN activity_template at ON at.id = wsi.activity_template_id
         WHERE ws.child_id = $1 AND ws.day_of_week = 2
         ORDER BY wsi.sort_order ASC`,
        [childId]
      );
      assert.ok(schoolItems.rows.length >= 10);
      const schoolBlock = schoolItems.rows.find((r) => r.source_canonical_id === 'school');
      assert.equal(schoolBlock.start_time, '08:00');
      assert.equal(schoolBlock.end_time, '15:00');

      const preschoolCopy = await copyCanonicalScheduleToFamily(client, {
        familyId,
        childId,
        canonicalScheduleId: 'preschool_weekday',
        days: [3],
        locale: 'sv-SE',
      });
      assert.equal(preschoolCopy.ok, true);
      const preschoolItems = await db.query(
        `SELECT wsi.start_time, wsi.end_time, at.source_canonical_id
         FROM weekly_schedule_item wsi
         JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
         JOIN activity_template at ON at.id = wsi.activity_template_id
         WHERE ws.child_id = $1 AND ws.day_of_week = 3`,
        [childId]
      );
      const preschoolBlock = preschoolItems.rows.find((r) => r.source_canonical_id === 'preschool');
      assert.equal(preschoolBlock.start_time, '08:00');
      assert.equal(preschoolBlock.end_time, '15:00');

      const morningBrush = await db.query(
        `SELECT wsi.start_time, at.source_canonical_id
         FROM weekly_schedule_item wsi
         JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
         JOIN activity_template at ON at.id = wsi.activity_template_id
         WHERE ws.child_id = $1 AND ws.day_of_week = 1 AND at.source_canonical_id = 'brush_teeth'`,
        [childId]
      );
      assert.equal(morningBrush.rows[0].start_time, '07:30');

      // D/E/F/G: timers + provenance on brush_teeth / wash_hands
      const brushDefault = await findDefaultActivityByCanonical(db, 'brush_teeth');
      const brushFamily = await db.query(
        `SELECT id, source_default_activity_id, source_canonical_id, duration_seconds
         FROM activity_template
         WHERE family_id = $1 AND source_canonical_id = 'brush_teeth'
         LIMIT 1`,
        [familyId]
      );
      assert.equal(brushFamily.rows[0].source_default_activity_id, brushDefault.id);
      assert.equal(brushFamily.rows[0].source_canonical_id, 'brush_teeth');
      const brushSub = await db.query(
        `SELECT duration_seconds FROM activity_sub_step
         WHERE activity_template_id = $1 AND duration_seconds = 120`,
        [brushFamily.rows[0].id]
      );
      assert.equal(brushSub.rows.length, 1, 'brush_teeth.brush 120s timer expected');

      await copyCanonicalDefaultActivityToFamily(client, {
        familyId,
        canonicalActivityId: 'wash_hands',
        locale: 'sv-SE',
      });
      const washFamily = await db.query(
        `SELECT id FROM activity_template WHERE family_id = $1 AND source_canonical_id = 'wash_hands'`,
        [familyId]
      );
      const washSub = await db.query(
        `SELECT duration_seconds FROM activity_sub_step WHERE activity_template_id = $1`,
        [washFamily.rows[0].id]
      );
      assert.ok(washSub.rows.some((r) => r.duration_seconds === 20));

      // H: rename source before copy still resolves by canonical_id
      await db.query(
        `UPDATE default_activity_template SET name = 'Totally renamed wake' WHERE canonical_id = 'wake_up'`
      );
      const { familyId: family2, childId: child2 } = await createTestFamilyWithChild(db);
      const renamedCopy = await copyCanonicalScheduleToFamily(client, {
        familyId: family2,
        childId: child2,
        canonicalScheduleId: 'morning_routine',
        days: [1],
        locale: 'sv-SE',
      });
      assert.equal(renamedCopy.ok, true);

      // I/J: optional include/exclude homework on school weekday copy
      const { familyId: family3, childId: child3 } = await createTestFamilyWithChild(db);
      await copyCanonicalScheduleToFamily(client, {
        familyId: family3,
        childId: child3,
        canonicalScheduleId: 'school_weekday',
        days: [1],
        variants: { after_school: 'after_school_home' },
        optionalSelections: { homework: true, shower: false },
        locale: 'sv-SE',
      });
      const withHomework = await db.query(
        `SELECT at.source_canonical_id FROM weekly_schedule_item wsi
         JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
         JOIN activity_template at ON at.id = wsi.activity_template_id
         WHERE ws.child_id = $1`,
        [child3]
      );
      assert.ok(withHomework.rows.some((r) => r.source_canonical_id === 'homework'));
      assert.ok(!withHomework.rows.some((r) => r.source_canonical_id === 'shower'));

      const { familyId: family4, childId: child4 } = await createTestFamilyWithChild(db);
      await copyCanonicalScheduleToFamily(client, {
        familyId: family4,
        childId: child4,
        canonicalScheduleId: 'school_weekday',
        days: [1],
        variants: { after_school: 'after_school_club' },
        optionalSelections: { homework: false },
        locale: 'sv-SE',
      });
      const noHomework = await db.query(
        `SELECT at.source_canonical_id FROM weekly_schedule_item wsi
         JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
         JOIN activity_template at ON at.id = wsi.activity_template_id
         WHERE ws.child_id = $1`,
        [child4]
      );
      assert.ok(!noHomework.rows.some((r) => r.source_canonical_id === 'homework'));

      // K/L: after_school club/home snapshots
      const clubTemplate = await db.query(
        `SELECT name, source_canonical_id FROM activity_template
         WHERE family_id = $1 AND source_canonical_id = 'after_school'`,
        [familyId]
      );
      assert.equal(clubTemplate.rows[0].name, 'Fritids');
      const clubSteps = await db.query(
        `SELECT COUNT(*)::int AS count FROM activity_sub_step WHERE activity_template_id = (
           SELECT id FROM activity_template WHERE family_id = $1 AND source_canonical_id = 'after_school' LIMIT 1
         )`,
        [familyId]
      );
      assert.ok(clubSteps.rows[0].count >= 4);

      const homeTemplate = await db.query(
        `SELECT name FROM activity_template
         WHERE family_id = $1 AND source_canonical_id = 'after_school'`,
        [family3]
      );
      assert.equal(homeTemplate.rows[0].name, 'Åka hem');

      // M: unresolved after_school variant fails before write
      const { familyId: family5, childId: child5 } = await createTestFamilyWithChild(db);
      await assert.rejects(
        () => copyCanonicalScheduleToFamily(client, {
          familyId: family5,
          childId: child5,
          canonicalScheduleId: 'school_weekday',
          days: [1],
          locale: 'sv-SE',
        }),
        (err) => err instanceof CanonicalCopyError && err.code === CANONICAL_VARIANT_REQUIRED
      );
      const noSchedule = await db.query(
        `SELECT COUNT(*)::int AS count FROM weekly_schedule WHERE child_id = $1`,
        [child5]
      );
      assert.equal(noSchedule.rows[0].count, 0);

      // N: invalid variant fails
      await assert.rejects(
        () => copyCanonicalScheduleToFamily(client, {
          familyId: family5,
          childId: child5,
          canonicalScheduleId: 'school_weekday',
          days: [1],
          variants: { after_school: 'invalid_variant' },
          locale: 'sv-SE',
        }),
        (err) => err instanceof CanonicalCopyError && err.code === CANONICAL_VARIANT_INVALID
      );

      // O: rollback on mid-copy failure
      const { familyId: family6, childId: child6 } = await createTestFamilyWithChild(db);
      let insertCount = 0;
      const failingClient = {
        query: async (text, params) => {
          const normalized = String(text).replace(/\s+/g, ' ').trim();
          if (normalized.startsWith('INSERT INTO weekly_schedule_item')) {
            insertCount += 1;
            if (insertCount === 2) throw new Error('injected copy failure');
          }
          return client.query(text, params);
        },
      };
      await assert.rejects(
        () => copyCanonicalScheduleToFamily(failingClient, {
          familyId: family6,
          childId: child6,
          canonicalScheduleId: 'morning_routine',
          days: [1],
          locale: 'sv-SE',
        }),
        /injected copy failure/
      );
      const afterFailActivities = await db.query(
        `SELECT COUNT(*)::int AS count FROM activity_template WHERE family_id = $1`,
        [family6]
      );
      assert.equal(afterFailActivities.rows[0].count, 0);

      // P: master independence
      const { familyId: family7, childId: child7 } = await createTestFamilyWithChild(db);
      await copyCanonicalScheduleToFamily(client, {
        familyId: family7,
        childId: child7,
        canonicalScheduleId: 'morning_routine',
        days: [1],
        locale: 'sv-SE',
      });
      const beforeSnapshot = await db.query(
        `SELECT at.name, at.star_value, wsi.start_time
         FROM weekly_schedule_item wsi
         JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
         JOIN activity_template at ON at.id = wsi.activity_template_id
         WHERE ws.child_id = $1`,
        [child7]
      );
      await db.query(
        `UPDATE default_activity_template SET name = 'Mutated', star_value = 9 WHERE canonical_id = 'wake_up'`
      );
      await db.query(
        `UPDATE default_schedule_item SET start_time = '23:59'
         WHERE default_schedule_id = $1`,
        [morningScheduleId]
      );
      const afterSnapshot = await db.query(
        `SELECT at.name, at.star_value, wsi.start_time
         FROM weekly_schedule_item wsi
         JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
         JOIN activity_template at ON at.id = wsi.activity_template_id
         WHERE ws.child_id = $1`,
        [child7]
      );
      assert.deepEqual(afterSnapshot.rows, beforeSnapshot.rows);

      // Q: duplicate canonical source fails closed
      const wakeKeep = await db.query(
        `SELECT id FROM default_activity_template WHERE canonical_id = 'wake_up' ORDER BY id LIMIT 1`
      );
      const keepWakeId = wakeKeep.rows[0].id;
      await db.query(
        `INSERT INTO default_activity_template (name, canonical_id, icon, star_value, sub_steps, variants, seven_questions, deprecated, sort_order)
         SELECT 'Dupe wake', 'wake_up', icon, star_value, sub_steps, variants, seven_questions, deprecated, sort_order
         FROM default_activity_template WHERE id = $1`,
        [keepWakeId]
      );
      await assert.rejects(
        () => copyCanonicalScheduleToFamily(client, {
          familyId: family7,
          childId: child7,
          canonicalScheduleId: 'morning_routine',
          days: [2],
          locale: 'sv-SE',
        }),
        (err) => err instanceof CanonicalCopyError && err.code === CANONICAL_DUPLICATE_IDENTITY
      );
      await db.query(
        `DELETE FROM default_activity_template WHERE canonical_id = 'wake_up' AND id != $1`,
        [keepWakeId]
      );

      // R: existing same-name family row is not reused without provenance
      const { familyId: family8, childId: child8 } = await createTestFamilyWithChild(db);
      await db.query(
        `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, source)
         VALUES ($1, 'Vakna', '🛏️', 1, 0, 'user')`,
        [family8]
      );
      await copyCanonicalScheduleToFamily(client, {
        familyId: family8,
        childId: child8,
        canonicalScheduleId: 'morning_routine',
        days: [1],
        locale: 'sv-SE',
      });
      const wakeRows = await db.query(
        `SELECT source_canonical_id FROM activity_template WHERE family_id = $1 AND name = 'Vakna'`,
        [family8]
      );
      assert.ok(wakeRows.rows.some((r) => r.source_canonical_id === 'wake_up'));
      assert.ok(wakeRows.rows.some((r) => r.source_canonical_id == null));

      // S: repeated copy reuses provenance-backed templates (no duplicate canonical family rows)
      const firstCount = await db.query(
        `SELECT COUNT(*)::int AS count FROM activity_template
         WHERE family_id = $1 AND source_canonical_id IS NOT NULL`,
        [familyId]
      );
      await copyCanonicalScheduleToFamily(client, {
        familyId,
        childId,
        canonicalScheduleId: 'morning_routine',
        days: [4],
        overwrite: true,
        locale: 'sv-SE',
      });
      const secondCount = await db.query(
        `SELECT COUNT(*)::int AS count FROM activity_template
         WHERE family_id = $1 AND source_canonical_id IS NOT NULL`,
        [familyId]
      );
      assert.equal(firstCount.rows[0].count, secondCount.rows[0].count);

      // Locale: en-GB variant snapshot
      const { familyId: familyEn, childId: childEn } = await createTestFamilyWithChild(db);
      await db.query(`UPDATE family SET preferred_locale = 'en-GB' WHERE id = $1`, [familyEn]);
      await copyCanonicalScheduleToFamily(client, {
        familyId: familyEn,
        childId: childEn,
        canonicalScheduleId: 'school_weekday',
        days: [1],
        variants: { after_school: 'after_school_club' },
        locale: 'en-GB',
      });
      const enClub = await db.query(
        `SELECT name FROM activity_template WHERE family_id = $1 AND source_canonical_id = 'after_school'`,
        [familyEn]
      );
      assert.equal(enClub.rows[0].name, 'After-school club');

      // T: original family data untouched (family8 user row still exists)
      const userRow = await db.query(
        `SELECT COUNT(*)::int AS count FROM activity_template
         WHERE family_id = $1 AND source = 'user'`,
        [family8]
      );
      assert.equal(userRow.rows[0].count, 1);
    } finally {
      client.release();
      await db.cleanup();
    }
  });
});
