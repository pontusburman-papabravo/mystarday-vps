'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { findMigrationByName } = require('./helpers/migration-gate.js');

const MIGRATION_NAME = '1810000000005_family_locale_selection_metadata';

describe('migration 1810000000005 family locale selection metadata', () => {
  test('defines up() and down()', () => {
    const { mod } = findMigrationByName(MIGRATION_NAME);
    assert.equal(typeof mod.up, 'function');
    assert.equal(typeof mod.down, 'function');
  });

  test('schema columns, constraints, and indexes exist', async (t) => {
    const db = await setupTestDb({ truncate: false });
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const pg = require('../src/lib/db');

    try {
      const cols = await pg.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'family'
          AND column_name IN (
            'locale_selected_at', 'locale_selection_source', 'previous_locale',
            'english_beta_offer_state', 'english_beta_offer_remind_at'
          )
        ORDER BY column_name
      `);
      assert.equal(cols.rows.length, 5);

      const offerCol = cols.rows.find((r) => r.column_name === 'english_beta_offer_state');
      assert.equal(offerCol.is_nullable, 'NO');
      assert.match(offerCol.column_default, /not_shown/);

      const metaCol = await pg.query(`
        SELECT column_name, data_type, column_default
        FROM information_schema.columns
        WHERE table_name = 'contact_message' AND column_name = 'metadata'
      `);
      assert.equal(metaCol.rows.length, 1);
      assert.equal(metaCol.rows[0].data_type, 'jsonb');

      const offerCheck = await pg.query(`
        SELECT 1 FROM pg_constraint WHERE conname = 'family_english_beta_offer_state_check'
      `);
      assert.equal(offerCheck.rows.length, 1);

      const sourceCheck = await pg.query(`
        SELECT 1 FROM pg_constraint WHERE conname = 'family_locale_selection_source_check'
      `);
      assert.equal(sourceCheck.rows.length, 1);

      const idxLocale = await pg.query(`
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_family_preferred_locale'
      `);
      assert.equal(idxLocale.rows.length, 1);
    } finally {
      await db.cleanup();
    }
  });
});

describe('migration 1810000000007 family market country', () => {
  test('country and market_region columns exist', async (t) => {
    const db = await setupTestDb({ truncate: false });
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const pg = require('../src/lib/db');

    try {
      const cols = await pg.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'family'
          AND column_name IN ('country_code', 'market_region', 'country_selected_at', 'country_selection_source')
        ORDER BY column_name
      `);
      assert.equal(cols.rows.length, 4);

      const regionCheck = await pg.query(`
        SELECT 1 FROM pg_constraint WHERE conname = 'family_market_region_check'
      `);
      assert.equal(regionCheck.rows.length, 1);
    } finally {
      await db.cleanup();
    }
  });
});
