'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { findMigrationByName } = require('./helpers/migration-gate.js');

const MIGRATION_NAME = '1810290000000_standard_library_v11_foundation';

describe('migration 1810290000000 standard library v1.1 foundation', () => {
  test('defines up() and down()', () => {
    const { mod } = findMigrationByName(MIGRATION_NAME);
    assert.equal(typeof mod.up, 'function');
    assert.equal(typeof mod.down, 'function');
  });

  test('schema columns, constraints, indexes, and FK semantics', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    try {
      const datCols = await db.query(`
        SELECT column_name, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'default_activity_template'
          AND column_name IN (
            'canonical_id', 'name_i18n', 'icon_key', 'duration_seconds',
            'variants', 'deprecated', 'seven_questions', 'package_component'
          )
        ORDER BY column_name
      `);
      assert.equal(datCols.rows.length, 8);

      const canonicalCol = datCols.rows.find((r) => r.column_name === 'canonical_id');
      assert.equal(canonicalCol.is_nullable, 'YES');
      assert.equal(canonicalCol.column_default, null);

      const variantsCol = datCols.rows.find((r) => r.column_name === 'variants');
      assert.equal(variantsCol.is_nullable, 'NO');
      assert.match(variantsCol.column_default, /jsonb/);

      const deprecatedDat = datCols.rows.find((r) => r.column_name === 'deprecated');
      assert.equal(deprecatedDat.is_nullable, 'NO');
      assert.match(deprecatedDat.column_default, /false/i);

      const dsCols = await db.query(`
        SELECT column_name, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'default_schedule'
          AND column_name IN ('canonical_id', 'name_i18n', 'description_i18n', 'deprecated')
        ORDER BY column_name
      `);
      assert.equal(dsCols.rows.length, 4);
      assert.ok(dsCols.rows.every((r) => r.column_name === 'deprecated' ? r.is_nullable === 'NO' : r.is_nullable === 'YES'));

      const dsiCols = await db.query(`
        SELECT column_name, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'default_schedule_item'
          AND column_name IN ('is_optional', 'variant_key', 'default_activity_template_id')
        ORDER BY column_name
      `);
      assert.equal(dsiCols.rows.length, 3);
      const optionalCol = dsiCols.rows.find((r) => r.column_name === 'is_optional');
      assert.equal(optionalCol.is_nullable, 'NO');
      assert.match(optionalCol.column_default, /false/i);

      const atCols = await db.query(`
        SELECT column_name, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'activity_template'
          AND column_name IN ('source_default_activity_id', 'source_canonical_id')
        ORDER BY column_name
      `);
      assert.equal(atCols.rows.length, 2);
      assert.ok(atCols.rows.every((r) => r.is_nullable === 'YES'));

      const durationCheck = await db.query(`
        SELECT 1 FROM pg_constraint
        WHERE conname = 'default_activity_template_duration_seconds_range'
      `);
      assert.equal(durationCheck.rows.length, 1);

      const datIdx = await db.query(`
        SELECT indexdef FROM pg_indexes
        WHERE indexname = 'idx_default_activity_template_canonical_id'
      `);
      assert.equal(datIdx.rows.length, 1);
      assert.match(datIdx.rows[0].indexdef, /WHERE \(canonical_id IS NOT NULL\)/i);
      assert.doesNotMatch(datIdx.rows[0].indexdef, /UNIQUE/i);

      const dsIdx = await db.query(`
        SELECT indexdef FROM pg_indexes
        WHERE indexname = 'idx_default_schedule_canonical_id'
      `);
      assert.equal(dsIdx.rows.length, 1);
      assert.match(dsIdx.rows[0].indexdef, /WHERE \(canonical_id IS NOT NULL\)/i);
      assert.doesNotMatch(dsIdx.rows[0].indexdef, /UNIQUE/i);

      const uniqueCanonical = await db.query(`
        SELECT 1 FROM pg_indexes
        WHERE tablename IN ('default_activity_template', 'default_schedule')
          AND indexdef ILIKE '%canonical_id%'
          AND indexdef ILIKE '%UNIQUE%'
      `);
      assert.equal(uniqueCanonical.rows.length, 0);

      const legacyDefault = await db.query(`
        INSERT INTO default_activity_template (name, icon, star_value, sort_order)
        VALUES ('Legacy utan canonical', '🪥', 1, 1)
        RETURNING id, canonical_id, variants, deprecated
      `);
      assert.equal(legacyDefault.rows[0].canonical_id, null);
      assert.deepEqual(legacyDefault.rows[0].variants, []);
      assert.equal(legacyDefault.rows[0].deprecated, false);

      await assert.rejects(
        () => db.query(`
          INSERT INTO default_activity_template (name, duration_seconds)
          VALUES ('For kort timer', 4)
        `),
        /check constraint|violates check constraint/i
      );
      await assert.rejects(
        () => db.query(`
          INSERT INTO default_activity_template (name, duration_seconds)
          VALUES ('For lang timer', 3601)
        `),
        /check constraint|violates check constraint/i
      );

      const validTimer = await db.query(`
        INSERT INTO default_activity_template (name, duration_seconds)
        VALUES ('Timer QA', 120)
        RETURNING duration_seconds
      `);
      assert.equal(validTimer.rows[0].duration_seconds, 120);

      const schedule = await db.query(`
        INSERT INTO default_schedule (name) VALUES ('Test schema') RETURNING id
      `);
      const scheduleItem = await db.query(`
        INSERT INTO default_schedule_item (default_schedule_id, name, section, sort_order)
        VALUES ($1, 'Legacy steg', 'morgon', 0)
        RETURNING is_optional, variant_key
      `, [schedule.rows[0].id]);
      assert.equal(scheduleItem.rows[0].is_optional, false);
      assert.equal(scheduleItem.rows[0].variant_key, null);

      const family = await db.query(`
        INSERT INTO family (name, timezone) VALUES ('SL v11', 'Europe/Stockholm') RETURNING id
      `);
      const familyId = family.rows[0].id;

      const defaultAct = await db.query(`
        INSERT INTO default_activity_template (name, canonical_id)
        VALUES ('Provenance source', 'brush_teeth')
        RETURNING id
      `);
      const defaultId = defaultAct.rows[0].id;

      const familyAct = await db.query(`
        INSERT INTO activity_template (
          family_id, name, icon, star_value, sort_order, source,
          source_default_activity_id, source_canonical_id
        )
        VALUES ($1, 'Borsta tänder', '🪥', 1, 0, 'admin', $2, 'brush_teeth')
        RETURNING id, source_default_activity_id
      `, [familyId, defaultId]);
      const familyActId = familyAct.rows[0].id;
      assert.equal(familyAct.rows[0].source_default_activity_id, defaultId);

      const nullableAct = await db.query(`
        INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, source)
        VALUES ($1, 'Egen aktivitet', '⭐', 1, 1, 'user')
        RETURNING source_default_activity_id
      `, [familyId]);
      assert.equal(nullableAct.rows[0].source_default_activity_id, null);

      await db.query('DELETE FROM default_activity_template WHERE id = $1', [defaultId]);

      const afterDelete = await db.query(
        'SELECT id, source_default_activity_id FROM activity_template WHERE id = $1',
        [familyActId]
      );
      assert.equal(afterDelete.rows.length, 1);
      assert.equal(afterDelete.rows[0].source_default_activity_id, null);

      const familyActStill = await db.query(
        'SELECT 1 FROM activity_template WHERE id = $1',
        [familyActId]
      );
      assert.equal(familyActStill.rows.length, 1);
    } finally {
      await db.cleanup();
    }
  });
});
