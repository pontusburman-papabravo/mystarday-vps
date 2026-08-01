'use strict';

const DEADLOCK_SQLSTATE = '40P01';
const DEFAULT_MAX_ATTEMPTS = 3;

/**
 * TRUNCATE public tables with bounded retry on deadlock only (test fixture layer).
 * @param {import('pg').Pool} pool
 * @param {{ maxAttempts?: number, log?: (msg: string) => void }} [options]
 */
async function truncatePublicTablesWithRetry(pool, options = {}) {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const log = options.log || ((msg) => console.log(msg));

  const { rows } = await pool.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('_migrations')
  `);
  if (rows.length === 0) return;
  const tables = rows.map((r) => `"${r.tablename}"`).join(', ');
  const truncateSql = `TRUNCATE ${tables} RESTART IDENTITY CASCADE`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const client = await pool.connect();
    try {
      await client.query(truncateSql);
      client.release();
      return;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* ignore */
      }
      client.release();
      if (err.code !== DEADLOCK_SQLSTATE) {
        throw err;
      }
      log(`[test-db] truncate deadlock retry attempt ${attempt} SQLSTATE ${err.code}`);
      if (attempt === maxAttempts) {
        throw err;
      }
      const jitter = Math.floor(Math.random() * 25);
      const delayMs = 35 * attempt + jitter;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

module.exports = {
  DEADLOCK_SQLSTATE,
  truncatePublicTablesWithRetry,
};
