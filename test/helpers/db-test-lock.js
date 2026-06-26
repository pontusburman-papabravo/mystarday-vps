'use strict';

/**
 * Serialize real-DB test files across parallel Node test workers.
 * Uses PostgreSQL session advisory locks (safe across processes).
 */

const { Pool } = require('pg');

const LOCK_KEY = 77901234;

function isMockDatabaseUrl(url) {
  return !url || /mock_test/i.test(url);
}

/** @type {Map<string, Pool>} */
const lockPools = new Map();

function getLockPool(url) {
  let pool = lockPools.get(url);
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      max: 1,
      ssl: url.includes('localhost') ? false : { rejectUnauthorized: false },
    });
    lockPools.set(url, pool);
  }
  return pool;
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

  const pool = getLockPool(url);
  const client = await pool.connect();
  await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);

  return async () => {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]);
    } finally {
      client.release();
    }
  };
}

module.exports = { acquireDbTestLock, isMockDatabaseUrl, LOCK_KEY };
