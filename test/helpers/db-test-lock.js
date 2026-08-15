'use strict';

/**
 * Serialize real-DB test files across parallel Node test workers.
 * Uses PostgreSQL session advisory locks (safe across processes).
 *
 * Each acquire uses a dedicated Client (not pooled) so a leaked lock cannot
 * survive on a returned pool connection if cleanup is skipped.
 */

const { Client } = require('pg');
const {
  assertDestructiveTestDatabaseAllowed,
  REFUSED_CODE,
} = require('../../scripts/lib/test-database-safety.cjs');

const LOCK_KEY = 77901234;
const LOCK_WAIT_MS = Number(process.env.DB_TEST_LOCK_WAIT_MS || 120_000);

function isMockDatabaseUrl(url) {
  return !url || /mock_test/i.test(url);
}

function poolSsl(url) {
  return url.includes('localhost') ? false : { rejectUnauthorized: false };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveLockDatabaseUrl(databaseUrl) {
  if (databaseUrl) {
    if (isMockDatabaseUrl(databaseUrl)) {
      return null;
    }
    return databaseUrl;
  }

  const testUrl = String(process.env.TEST_DATABASE_URL || '').trim();
  if (!testUrl) {
    const { testDatabaseUrl } = assertDestructiveTestDatabaseAllowed(process.env);
    return testDatabaseUrl;
  }

  if (isMockDatabaseUrl(testUrl)) {
    return null;
  }

  const { testDatabaseUrl } = assertDestructiveTestDatabaseAllowed(process.env);
  return testDatabaseUrl;
}

/**
 * Acquire the global DB test lock. Returns release() for cleanup.
 * No-op when url is missing or mock.
 *
 * @param {string} [databaseUrl] Validated TEST_DATABASE_URL from setupTestDb.
 */
async function acquireDbTestLock(databaseUrl) {
  const url = resolveLockDatabaseUrl(databaseUrl);
  if (!url) {
    return async () => {};
  }

  const client = new Client({
    connectionString: url,
    ssl: poolSsl(url),
  });
  await client.connect();

  const deadline = Date.now() + LOCK_WAIT_MS;
  let acquired = false;
  while (!acquired) {
    const { rows } = await client.query('SELECT pg_try_advisory_lock($1) AS ok', [LOCK_KEY]);
    acquired = rows[0].ok === true;
    if (acquired) break;
    if (Date.now() >= deadline) {
      await client.end().catch(() => {});
      throw new Error(
        `Timed out after ${LOCK_WAIT_MS}ms waiting for DB test advisory lock — ` +
        'another test file may have leaked it (missing db.cleanup()?)'
      );
    }
    await sleep(50);
  }

  return async () => {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]);
    } finally {
      await client.end().catch(() => {});
    }
  };
}

module.exports = { acquireDbTestLock, isMockDatabaseUrl, LOCK_KEY, LOCK_WAIT_MS };
