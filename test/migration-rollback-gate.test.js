'use strict';

/**
 * G3c — migration/rollback gate for destructive schema phase (A5c/B1 prep).
 * Verifies npm run migrate + down rollback on empty and dev-like DBs.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  listMigrationsWithDown,
  wipePublicSchema,
  tableExists,
  rollbackLastApplied,
  runMigrate,
} = require('./helpers/migration-gate.js');
const { withMigrationGateDatabase } = require('./helpers/migration-gate-database.js');

const CORE_TABLE = 'family';

async function appliedMigrationCount(client) {
  const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM _migrations');
  return rows[0].n;
}

test('migration inventory: latest folder migration exposes down()', () => {
  const withDown = listMigrationsWithDown();
  assert.ok(withDown.length >= 5, 'expected several migrations with down()');
  const latestFile = fs.readdirSync(path.join(__dirname, '../migrations'))
    .filter((f) => f.endsWith('.js'))
    .sort()
    .pop();
  const filePath = path.join(__dirname, '../migrations', latestFile);
  const mod = require(filePath);
  assert.equal(typeof mod.down, 'function', `latest migration ${latestFile} must define down() for G3c gate`);
});

test('G3c dev-like DB: migrate, rollback latest, re-migrate', async (t) => {
  await withMigrationGateDatabase(t, async ({ testUrl, pool }) => {
    const client = await pool.connect();
    try {
      runMigrate(testUrl);

      const countBefore = await appliedMigrationCount(client);
      assert.ok(countBefore > 0, 'expected applied migrations');
      assert.equal(await tableExists(client, CORE_TABLE), true, 'family table missing');

      const rolled = await rollbackLastApplied(pool, 1);
      assert.equal(rolled.length, 1);

      const countAfterRollback = await appliedMigrationCount(client);
      assert.equal(countAfterRollback, countBefore - 1);

      runMigrate(testUrl);
      assert.equal(await tableExists(client, CORE_TABLE), true, 'family table missing after re-migrate');

      const countAfterRemigrate = await appliedMigrationCount(client);
      assert.equal(countAfterRemigrate, countBefore, 'migration count should match after rollback + re-migrate');
    } finally {
      client.release();
    }
  });
});

test('G3c empty DB: wipe, migrate, rollback latest, re-migrate', async (t) => {
  await withMigrationGateDatabase(t, async ({ testUrl, pool }) => {
    const client = await pool.connect();
    try {
      await wipePublicSchema(client);
      runMigrate(testUrl);

      const countBefore = await appliedMigrationCount(client);
      assert.ok(countBefore > 0, 'migrate on empty DB should apply folder migrations');
      assert.equal(await tableExists(client, CORE_TABLE), true);
      assert.equal(await tableExists(client, 'users'), false, 'legacy users table must not be bootstrapped');

      await rollbackLastApplied(pool, 1);
      assert.equal(await appliedMigrationCount(client), countBefore - 1);

      const { captureDbIntegritySnapshot } = await import('../scripts/ops/lib/db-integrity-snapshot-core.mjs');
      const { compareDbSnapshots } = await import('../scripts/ops/lib/compare-snapshots.mjs');
      const beforeSnap = await captureDbIntegritySnapshot(testUrl, { label: 'pre-181052' });

      runMigrate(testUrl);
      assert.equal(await tableExists(client, CORE_TABLE), true);
      assert.equal(await tableExists(client, 'users'), false, 'legacy users table must not be bootstrapped');
      assert.equal(await appliedMigrationCount(client), countBefore);

      const { rows: appleCols } = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
          FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'parent'
           AND column_name IN ('apple_refresh_token', 'apple_client_hint')
         ORDER BY column_name
      `);
      assert.deepEqual(
        appleCols.map((r) => ({
          column_name: r.column_name,
          data_type: r.data_type,
          is_nullable: r.is_nullable,
          column_default: r.column_default,
          character_maximum_length: r.character_maximum_length,
        })),
        [
          {
            column_name: 'apple_client_hint',
            data_type: 'character varying',
            is_nullable: 'YES',
            column_default: null,
            character_maximum_length: 16,
          },
          {
            column_name: 'apple_refresh_token',
            data_type: 'text',
            is_nullable: 'YES',
            column_default: null,
            character_maximum_length: null,
          },
        ]
      );

      const { rows: surveyCols } = await client.query(`
        SELECT column_name
          FROM information_schema.columns
         WHERE table_schema = 'public'
           AND (
             (table_name = 'surveys' AND column_name IN ('contest_collect_after_submit', 'contest_terms_url'))
             OR (table_name = 'survey_questions' AND column_name = 'max_selections')
             OR (table_name = 'survey_contest_entries' AND column_name = 'age_confirmed_18')
           )
         ORDER BY table_name, column_name
      `);
      assert.deepEqual(
        surveyCols.map((r) => r.column_name),
        ['age_confirmed_18', 'max_selections', 'contest_collect_after_submit', 'contest_terms_url']
      );

      const afterSnap = await captureDbIntegritySnapshot(testUrl, { label: 'post-181052' });
      const compare = compareDbSnapshots(beforeSnap, afterSnap, {
        mode: 'post-migration',
        repoRoot: path.join(__dirname, '..'),
      });
      assert.equal(compare.ok, true, JSON.stringify(compare.drift));
      assert.deepEqual(compare.newMigrationNames || [], ['1810520000000_for_dig_outcome_followup_pilot_safety']);
    } finally {
      client.release();
    }
  });
});
