'use strict';

/**
 * PR5 — Standard Library v1.1 final cleanup and acceptance (behavior tests).
 * Source-contract frozen counts are supplemented by standard-library-v11-content.test.js.
 */

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { setupTestDb } = require('./helpers/setup.js');
const {
  seedCanonicalLibrary,
  createTestFamilyWithChild,
  createSecondChildInFamily,
  getAfterSchoolScheduleSnapshot,
  getSubstepNames,
  findScheduleIdByCanonical,
  findDefaultActivityByCanonical,
} = require('./helpers/canonical-library-fixture.js');
const {
  readManifestFile,
  DEFAULT_MANIFEST_PATH,
} = require('../src/lib/standard-library-manifest');
const {
  copyCanonicalScheduleToFamily,
  previewCanonicalScheduleSection,
  CanonicalCopyError,
  CANONICAL_DUPLICATE_IDENTITY,
} = require('../src/lib/canonical-library-copy');
const {
  NON_INTERACTIVE_AFTER_SCHOOL_VARIANT,
} = require('../src/lib/canonical-library-runtime');
const { getGoalActivationPreview } = require('../src/lib/for-dig-activate');
const { seedFamilyStarterActivitiesFromCanonicalDb } = require('../src/lib/standard-library-family-seed.js');

const SV_CLUB_SUBSTEPS = [
  'Gå in på fritids',
  'Äta mellanmål',
  'Leka på fritids',
  'Vänta på hämtning',
];

describe('canonical library PR5 — final acceptance', () => {
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

  describe('frozen v1.1 source contract (8 / 31 / 98)', () => {
    it('manifest has exactly 8 schedules, 31 activities, 98 schedule items', () => {
      const manifest = readManifestFile(DEFAULT_MANIFEST_PATH);
      assert.equal(manifest.schedules.length, 8);
      assert.equal(manifest.activities.length, 31);
      const itemCount = manifest.schedules.reduce(
        (sum, s) => sum + (s.items?.length || 0),
        0
      );
      assert.equal(itemCount, 98);
    });

    it('manifest locales include sv and en-GB on every activity', () => {
      const manifest = readManifestFile(DEFAULT_MANIFEST_PATH);
      for (const activity of manifest.activities) {
        assert.ok(activity.name_i18n?.sv, `${activity.activity_id} missing sv`);
        assert.ok(activity.name_i18n?.['en-GB'], `${activity.activity_id} missing en-GB`);
      }
    });
  });

  describe('timer data preservation', () => {
    test('brush_teeth brush = 120 and wash_hands wash = 20 in canonical DB', async (t) => {
      if (!seeded) {
        t.skip('Canonical library not seeded');
        return;
      }
      const brush = await findDefaultActivityByCanonical(db, 'brush_teeth');
      const wash = await findDefaultActivityByCanonical(db, 'wash_hands');
      assert.ok(brush);
      assert.ok(wash);
      const brushStep = brush.sub_steps.find((s) => s.step_id?.includes('.brush'));
      const washStep = wash.sub_steps.find((s) => s.step_id?.includes('.wash'));
      assert.equal(brushStep?.duration_seconds, 120);
      assert.equal(washStep?.duration_seconds, 20);
    });

    test('no unintended default timers on non-timer activities', async (t) => {
      if (!seeded) {
        t.skip('Canonical library not seeded');
        return;
      }
      const noTimerIds = [
        'bedtime_reading',
        'homework',
        'free_time',
        'calm_time',
        'breakfast',
        'lunch',
        'dinner',
        'snack',
        'sleep',
        'family_activity',
      ];
      for (const id of noTimerIds) {
        const act = await findDefaultActivityByCanonical(db, id);
        assert.ok(act, id);
        const subSteps = typeof act.sub_steps === 'string'
          ? JSON.parse(act.sub_steps)
          : (act.sub_steps || []);
        const timed = subSteps.filter((s) => s.duration_seconds != null);
        assert.equal(timed.length, 0, `${id} should have no timed substeps`);
      }
    });
  });

  describe('after_school acceptance', () => {
    test('club and home labels, substeps, provenance — sv and en-GB', async (t) => {
      if (!seeded) {
        t.skip('Canonical library not seeded');
        return;
      }

      const client = await db.pool.connect();
      try {
        const { familyId, childId: childClub } = await createTestFamilyWithChild(db);
        const childHome = await createSecondChildInFamily(db, familyId);

        await copyCanonicalScheduleToFamily(client, {
          familyId,
          childId: childClub,
          canonicalScheduleId: 'school_weekday',
          days: [1],
          variants: { after_school: 'after_school_club' },
          locale: 'sv-SE',
        });
        const club = await getAfterSchoolScheduleSnapshot(db, childClub, 1);
        assert.equal(club.source_canonical_id, 'after_school');
        assert.equal(club.name, 'Fritids');
        assert.ok(!/Fritids \/ Åka hem/i.test(club.name));
        assert.deepEqual(await getSubstepNames(db, club.template_id), SV_CLUB_SUBSTEPS);

        await copyCanonicalScheduleToFamily(client, {
          familyId,
          childId: childHome,
          canonicalScheduleId: 'school_weekday',
          days: [2],
          variants: { after_school: 'after_school_home' },
          locale: 'en-GB',
        });
        const home = await getAfterSchoolScheduleSnapshot(db, childHome, 2);
        assert.equal(home.source_canonical_id, 'after_school');
        assert.equal(home.name, 'Go home');
        assert.deepEqual(
          (await db.query(
            `SELECT name FROM activity_sub_step WHERE activity_template_id = $1 ORDER BY sort_order`,
            [home.template_id]
          )).rows.map((r) => r.name),
          ['Leave school', 'Travel home', 'Arrive home', 'Put bag away']
        );
      } finally {
        client.release();
      }
    });
  });

  describe('För dig canonical preview / execution parity', () => {
    test('schedule preview survives default_schedule.name rename', async (t) => {
      if (!seeded) {
        t.skip('Canonical library not seeded');
        return;
      }

      await db.query(
        `UPDATE default_schedule SET name = 'Display rename QA'
         WHERE canonical_id = 'evening_routine'`
      );

      const preview = await getGoalActivationPreview('trygga-kvallar', { locale: 'sv-SE' });
      assert.equal(preview.type, 'schedule');
      assert.ok(preview.items.length > 0);
      assert.ok(preview.items.some((i) => /borsta/i.test(i.name)));
    });

    test('school_weekday preview uses after_school_home like copySchedule', async (t) => {
      if (!seeded) {
        t.skip('Canonical library not seeded');
        return;
      }

      const client = await db.pool.connect();
      try {
        const previewItems = await previewCanonicalScheduleSection(client, {
          canonicalScheduleId: 'school_weekday',
          section: 'dag',
          locale: 'sv-SE',
          variants: { after_school: NON_INTERACTIVE_AFTER_SCHOOL_VARIANT },
        });
        const afterSchool = previewItems.find((i) => /hem/i.test(i.name));
        assert.ok(afterSchool, 'preview should show home variant label');
        assert.ok(!/fritids/i.test(afterSchool.name));
      } finally {
        client.release();
      }
    });
  });

  describe('duplicate identity fail-closed', () => {
    test('duplicate default_schedule canonical_id fails preview', async (t) => {
      if (!seeded) {
        t.skip('Canonical library not seeded');
        return;
      }

      const eveningId = await findScheduleIdByCanonical(db, 'evening_routine');
      await db.query(
        `INSERT INTO default_schedule (name, canonical_id, sort_order)
         VALUES ('Dup evening', 'evening_routine', 997)`
      );

      const client = await db.pool.connect();
      try {
        await assert.rejects(
          () => previewCanonicalScheduleSection(client, {
            canonicalScheduleId: 'evening_routine',
            section: 'kvall',
            locale: 'sv-SE',
          }),
          (err) => err instanceof CanonicalCopyError && err.code === CANONICAL_DUPLICATE_IDENTITY
        );
      } finally {
        client.release();
        await db.query(
          `DELETE FROM default_schedule WHERE name = 'Dup evening' AND id != $1`,
          [eveningId]
        );
      }
    });
  });

  describe('family snapshot independence', () => {
    test('mutating canonical master does not change existing family copy', async (t) => {
      if (!seeded) {
        t.skip('Canonical library not seeded');
        return;
      }

      const client = await db.pool.connect();
      try {
        const { familyId, childId } = await createTestFamilyWithChild(db);
        await copyCanonicalScheduleToFamily(client, {
          familyId,
          childId,
          canonicalScheduleId: 'morning_routine',
          days: [1],
          locale: 'sv-SE',
        });

        const before = await db.query(
          `SELECT at.name FROM weekly_schedule_item wsi
           JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
           JOIN activity_template at ON at.id = wsi.activity_template_id
           WHERE ws.child_id = $1`,
          [childId]
        );

        await db.query(
          `UPDATE default_activity_template SET name = 'Mutated master'
           WHERE canonical_id = 'wake_up'`
        );

        const after = await db.query(
          `SELECT at.name FROM weekly_schedule_item wsi
           JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
           JOIN activity_template at ON at.id = wsi.activity_template_id
           WHERE ws.child_id = $1`,
          [childId]
        );
        assert.deepEqual(after.rows, before.rows);
      } finally {
        client.release();
      }
    });
  });

  describe('registration canonical path', () => {
    test('seedFamilyStarterActivitiesFromCanonicalDb sets source_canonical_id provenance', async (t) => {
      if (!seeded) {
        t.skip('Canonical library not seeded');
        return;
      }

      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');
        const familyRes = await client.query(
          `INSERT INTO family (name, timezone, preferred_locale)
           VALUES ('PR5 register QA', 'Europe/Stockholm', 'sv-SE') RETURNING id`
        );
        const familyId = familyRes.rows[0].id;
        const cat = await client.query(
          'INSERT INTO category (family_id, name, sort_order, is_default) VALUES ($1, $2, 0, true) RETURNING id',
          [familyId, 'Förskola']
        );
        const copied = await seedFamilyStarterActivitiesFromCanonicalDb(
          client,
          familyId,
          { forskola: cat.rows[0].id },
          'sv-SE'
        );
        assert.ok(copied > 0);
        const prov = await client.query(
          `SELECT COUNT(*)::int AS n FROM activity_template
           WHERE family_id = $1 AND source_canonical_id IS NOT NULL`,
          [familyId]
        );
        assert.ok(prov.rows[0].n > 0);
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    });
  });

  describe('preview / execution parity (adversarial)', () => {
    test('onboarding schedule-preview survives default_schedule.name rename', async (t) => {
      if (!seeded) {
        t.skip('Canonical library not seeded');
        return;
      }

      await db.query(
        `UPDATE default_schedule SET name = 'Renamed onboarding preview'
         WHERE canonical_id = 'morning_routine'`
      );

      const result = await db.query(
        `SELECT dsi.name
         FROM default_schedule_item dsi
         JOIN default_schedule ds ON ds.id = dsi.default_schedule_id
         WHERE ds.canonical_id = $1`,
        ['morning_routine']
      );
      assert.ok(result.rows.length > 0);
    });

    test('getGoalActivationPreview fails closed on duplicate schedule identity', async (t) => {
      if (!seeded) {
        t.skip('Canonical library not seeded');
        return;
      }

      const eveningId = await findScheduleIdByCanonical(db, 'evening_routine');
      await db.query(
        `INSERT INTO default_schedule (name, canonical_id, sort_order)
         VALUES ('Dup evening preview', 'evening_routine', 995)`
      );

      try {
        await assert.rejects(
          () => getGoalActivationPreview('trygga-kvallar', { locale: 'sv-SE' }),
          (err) => err instanceof CanonicalCopyError && err.code === CANONICAL_DUPLICATE_IDENTITY
        );
      } finally {
        await db.query(
          `DELETE FROM default_schedule WHERE name = 'Dup evening preview' AND id != $1`,
          [eveningId]
        );
      }
    });

    test('getGoalActivationPreview fails closed on duplicate activity identity', async (t) => {
      if (!seeded) {
        t.skip('Canonical library not seeded');
        return;
      }

      const getDressed = await findDefaultActivityByCanonical(db, 'get_dressed');
      assert.ok(getDressed);
      await db.query(
        `INSERT INTO default_activity_template (name, icon, star_value, sort_order, canonical_id)
         VALUES ('Dup get dressed', '👕', 1, 994, 'get_dressed')`
      );

      try {
        await assert.rejects(
          () => getGoalActivationPreview('sjalvstandighet', { locale: 'sv-SE' }),
          (err) => err instanceof CanonicalCopyError && err.code === CANONICAL_DUPLICATE_IDENTITY
        );
      } finally {
        await db.query(
          `DELETE FROM default_activity_template WHERE name = 'Dup get dressed' AND id != $1`,
          [getDressed.id]
        );
      }
    });
  });

  describe('family snapshot — brush_teeth timer', () => {
    test('brush substep duration_seconds stays 120 after canonical master mutates', async (t) => {
      if (!seeded) {
        t.skip('Canonical library not seeded');
        return;
      }

      const client = await db.pool.connect();
      try {
        const { familyId, childId } = await createTestFamilyWithChild(db);
        await copyCanonicalScheduleToFamily(client, {
          familyId,
          childId,
          canonicalScheduleId: 'morning_routine',
          days: [1],
          locale: 'sv-SE',
        });

        const brushTpl = await db.query(
          `SELECT at.id FROM activity_template at
           JOIN weekly_schedule_item wsi ON wsi.activity_template_id = at.id
           JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
           WHERE ws.child_id = $1 AND at.source_canonical_id = 'brush_teeth' LIMIT 1`,
          [childId]
        );
        assert.ok(brushTpl.rows[0]);

        const before = await db.query(
          `SELECT duration_seconds FROM activity_sub_step
           WHERE activity_template_id = $1 AND name = 'Borsta tänderna'`,
          [brushTpl.rows[0].id]
        );
        assert.equal(before.rows[0]?.duration_seconds, 120);

        await db.query(
          `UPDATE default_activity_template SET sub_steps = '[]'::jsonb
           WHERE canonical_id = 'brush_teeth'`
        );

        const after = await db.query(
          `SELECT duration_seconds FROM activity_sub_step
           WHERE activity_template_id = $1 AND name = 'Borsta tänderna'`,
          [brushTpl.rows[0].id]
        );
        assert.equal(after.rows[0]?.duration_seconds, 120);
      } finally {
        client.release();
      }
    });
  });

  describe('canonical runtime name identity audit', () => {
    it('for-dig-activate has no default_schedule display-name SQL identity', () => {
      const src = fs.readFileSync(
        path.join(__dirname, '../src/lib/for-dig-activate.js'),
        'utf8'
      );
      assert.doesNotMatch(src, /default_schedule WHERE LOWER\(name\)/i);
      assert.doesNotMatch(src, /default_schedule WHERE name = \$/i);
    });

    it('onboarding canonical paths resolve default_schedule by canonical_id', () => {
      const src = fs.readFileSync(
        path.join(__dirname, '../src/routes/onboarding.js'),
        'utf8'
      );
      assert.match(src, /default_schedule WHERE canonical_id = \$1/);
      assert.match(src, /NON_CANONICAL_SNAPSHOT/);
      assert.doesNotMatch(src, /WHERE ds\.name = \$1/);
    });

    it('canonical-library-runtime has no SQL name identity', () => {
      const src = fs.readFileSync(
        path.join(__dirname, '../src/lib/canonical-library-runtime.js'),
        'utf8'
      );
      assert.doesNotMatch(src, /LOWER\s*\(\s*name\s*\)/i);
    });
  });

  describe('transaction rollback on canonical validation failure', () => {
    test('copyCanonicalScheduleToFamily rolls back family writes on duplicate identity', async (t) => {
      if (!seeded) {
        t.skip('Canonical library not seeded');
        return;
      }

      const morningId = await findScheduleIdByCanonical(db, 'morning_routine');
      await db.query(
        `INSERT INTO default_schedule (name, canonical_id, sort_order)
         VALUES ('Dup morning PR5', 'morning_routine', 996)`
      );

      const client = await db.pool.connect();
      try {
        const { familyId, childId } = await createTestFamilyWithChild(db);
        await client.query('BEGIN');
        await assert.rejects(
          () => copyCanonicalScheduleToFamily(client, {
            familyId,
            childId,
            canonicalScheduleId: 'morning_routine',
            days: [1],
            locale: 'sv-SE',
            externalTransaction: true,
          }),
          (err) => err instanceof CanonicalCopyError && err.code === CANONICAL_DUPLICATE_IDENTITY
        );
        await client.query('ROLLBACK');

        const items = await db.query(
          `SELECT COUNT(*)::int AS n FROM weekly_schedule_item wsi
           JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
           WHERE ws.child_id = $1`,
          [childId]
        );
        assert.equal(items.rows[0].n, 0);
      } finally {
        client.release();
        await db.query(
          `DELETE FROM default_schedule WHERE name = 'Dup morning PR5' AND id != $1`,
          [morningId]
        );
      }
    });
  });

  test('cleanup', async (t) => {
    if (!db || db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    await db.cleanup();
  });
});
