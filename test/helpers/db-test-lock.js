'use strict';

/**
 * Serialize real-DB test files across parallel Node test workers.
 * Uses PostgreSQL session advisory locks (safe across processes).
 *
 * Each acquire uses a dedicated Client (not pooled) so a leaked lock cannot
 * survive on a returned pool connection if cleanup is skipped.
 */

const { Client } = require('pg');

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

/**
 * Acquire the global DB test lock. Returns release() for cleanup.
 * No-op when DATABASE_URL is missing or mock.
 */
async function acquireDbTestLock() {
  const url = process.env.DATABASE_URL;
  if (isMockDatabaseUrl(url)) {
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
