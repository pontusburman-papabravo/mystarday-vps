'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const {
  isDisposableTestDatabaseName,
  assertDisposableDatabaseName,
  listFolderMigrationNames,
} = require('./helpers/database-branch-guard.js');

describe('database branch guard', () => {
  test('accepts disposable test database names', () => {
    assert.equal(isDisposableTestDatabaseName('stjarndag_test'), true);
    assert.equal(isDisposableTestDatabaseName('stjarndag_test_1730000000_42'), true);
    assert.equal(isDisposableTestDatabaseName('stjarndag_migrate_gate_1730000000_42'), true);
    assert.equal(isDisposableTestDatabaseName('stjarndag_clean_1730000000'), true);
    assert.equal(isDisposableTestDatabaseName('integrity_restore_foo'), true);
    assert.equal(isDisposableTestDatabaseName('production_main'), false);
  });

  test('rejects non-disposable names', () => {
    assert.throws(() => assertDisposableDatabaseName('stjarndag'), /TEST_DATABASE_NOT_DISPOSABLE/);
  });

  test('folder migration inventory is non-empty', () => {
    const names = listFolderMigrationNames();
    assert.ok(names.length > 10);
    assert.ok(!names.some((n) => n.includes('1810130000000_iap_event_ordering_tiebreak')));
  });
});

describe('applied migrations match filesystem', () => {
  test('detects orphan _migrations rows', async (t) => {
    const url = process.env.DATABASE_URL;
    if (!url || /mock_test/i.test(url)) {
      t.skip('DATABASE_URL not set');
      return;
    }
    const {
      createDisposableDatabase,
      dropDisposableDatabase,
      generateDisposableDatabaseName,
      assertMigrationsMatchFilesystem,
    } = require('./helpers/database-branch-guard.js');
    const { Pool } = require('pg');
    const dbName = generateDisposableDatabaseName('stjarndag_test');
    const testUrl = await createDisposableDatabase(url, dbName);
    const pool = new Pool({ connectionString: testUrl, ssl: false });
    const client = await pool.connect();
    try {
      await client.query('CREATE TABLE _migrations (id SERIAL PRIMARY KEY, name TEXT NOT NULL)');
      await client.query(`INSERT INTO _migrations (name) VALUES ('orphan_from_other_branch')`);
      await assert.rejects(() => assertMigrationsMatchFilesystem(pool), (err) => {
        assert.match(err.message, /TEST_DATABASE_SCHEMA_FROM_DIFFERENT_BRANCH/);
        return true;
      });
    } finally {
      client.release();
      await pool.end();
      await dropDisposableDatabase(url, dbName);
    }
  });
});
