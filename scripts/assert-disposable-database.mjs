#!/usr/bin/env node
/**
 * Fail closed when DATABASE_URL points at a non-disposable DB or _migrations
 * contains rows from another git branch.
 */
import { createRequire } from 'node:module';
import pg from 'pg';

const require = createRequire(import.meta.url);
const {
  assertDisposableDatabaseUrl,
  assertMigrationsMatchFilesystem,
} = require('../test/helpers/database-branch-guard.js');

const { Pool } = pg;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('assert-disposable-database: DATABASE_URL is not set');
    process.exit(1);
  }

  const dbName = assertDisposableDatabaseUrl(url);
  const pool = new Pool({
    connectionString: url,
    ssl: url.includes('localhost') ? false : { rejectUnauthorized: false },
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

  console.error(`[assert-disposable-database] OK disposable=${dbName}`);
}

main().catch((err) => {
  console.error(`[assert-disposable-database] FAILED: ${err.message}`);
  process.exit(1);
});
