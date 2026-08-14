#!/usr/bin/env node
/**
 * Fail closed when TEST_DATABASE_URL points at a non-disposable DB or _migrations
 * contains rows from another git branch.
 */
import { createRequire } from 'node:module';
import pg from 'pg';

const require = createRequire(import.meta.url);
const {
  assertMigrationsMatchFilesystem,
} = require('../test/helpers/database-branch-guard.js');
const { assertDestructiveTestDatabaseAllowed } = require('./lib/test-database-safety.cjs');

const { Pool } = pg;

async function main() {
  let testDatabaseUrl;
  try {
    ({ testDatabaseUrl } = assertDestructiveTestDatabaseAllowed(process.env));
  } catch (err) {
    console.error(`[assert-disposable-database] ${err.code || 'REFUSED'}: ${err.message}`);
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: testDatabaseUrl,
    ssl: testDatabaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
  });
  try {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_migrations'`
      );
      if (rows.length > 0) {
        await assertMigrationsMatchFilesystem(client);
      }
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }

  console.error(`[assert-disposable-database] OK disposable=${new URL(testDatabaseUrl).pathname.replace(/^\//, '')}`);
}

main().catch((err) => {
  console.error(`[assert-disposable-database] FAILED: ${err.message}`);
  process.exit(1);
});
