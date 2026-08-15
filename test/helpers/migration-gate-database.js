'use strict';

const { acquireDbTestLock } = require('./db-test-lock.js');
const { isMockDatabaseUrl } = require('./migration-gate.js');
const {
  createDisposableDatabase,
  dropDisposableDatabase,
  generateDisposableDatabaseName,
  assertMigrationsMatchFilesystem,
} = require('./database-branch-guard.js');
const {
  assertDestructiveTestDatabaseAllowed,
  REFUSED_CODE,
} = require('../../scripts/lib/test-database-safety.cjs');

/**
 * Run a migration-gate test against a dedicated disposable database.
 * Creates DB, runs fn(testUrl), drops DB in finally (even on failure).
 */
async function withMigrationGateDatabase(t, fn) {
  const testUrlRaw = String(process.env.TEST_DATABASE_URL || '').trim();
  if (!testUrlRaw) {
    try {
      assertDestructiveTestDatabaseAllowed(process.env);
    } catch (err) {
      err.message = `[migration-gate-db] ${err.message}`;
      if (!err.code) err.code = REFUSED_CODE;
      throw err;
    }
  }

  if (isMockDatabaseUrl(testUrlRaw)) {
    t.skip('TEST_DATABASE_URL not set or mock');
    return;
  }

  let baseUrl;
  try {
    ({ testDatabaseUrl: baseUrl } = assertDestructiveTestDatabaseAllowed(process.env));
  } catch (err) {
    err.message = `[migration-gate-db] ${err.message}`;
    if (!err.code) err.code = REFUSED_CODE;
    throw err;
  }

  const dbName = generateDisposableDatabaseName('stjarndag_migrate_gate');
  const releaseLock = await acquireDbTestLock(baseUrl);
  let testUrl;
  try {
    testUrl = await createDisposableDatabase(baseUrl, dbName);
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: testUrl,
      ssl: testUrl.includes('localhost') ? false : { rejectUnauthorized: false },
    });
    try {
      await fn({ testUrl, pool, dbName });
    } finally {
      await pool.end();
    }
  } finally {
    try {
      if (testUrl) {
        await dropDisposableDatabase(baseUrl, dbName);
      }
    } catch (dropErr) {
      console.error(`[migration-gate-db] drop failed for ${dbName}:`, dropErr.message);
    }
    await releaseLock();
  }
}

module.exports = {
  withMigrationGateDatabase,
  assertMigrationsMatchFilesystem,
};
