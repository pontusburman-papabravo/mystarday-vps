'use strict';

const { URL } = require('url');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '../..');
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'migrations');

function parseDatabaseUrl(url) {
  const parsed = new URL(url);
  const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  return { parsed, dbName };
}

function adminConnectionString(url) {
  const { parsed } = parseDatabaseUrl(url);
  const admin = new URL(url);
  admin.pathname = '/postgres';
  return admin.toString();
}

async function withAdminPool(url, fn) {
  const pool = new Pool({
    connectionString: adminConnectionString(url),
    ssl: url.includes('localhost') ? false : { rejectUnauthorized: false },
  });
  try {
    return await fn(pool);
  } finally {
    await pool.end();
  }
}

async function createDisposableDatabase(baseUrl, dbName) {
  if (!/^iap_mig_test_[a-z0-9_]+$/.test(dbName)) {
    throw new Error(`Refusing disposable name: ${dbName}`);
  }
  await withAdminPool(baseUrl, async (pool) => {
    await pool.query(`DROP DATABASE IF EXISTS ${quoteIdent(dbName)}`);
    await pool.query(`CREATE DATABASE ${quoteIdent(dbName)}`);
  });
  const target = new URL(baseUrl);
  target.pathname = `/${dbName}`;
  return target.toString();
}

async function dropDisposableDatabase(baseUrl, dbName) {
  if (!/^iap_mig_test_[a-z0-9_]+$/.test(dbName)) {
    throw new Error(`Refusing disposable name: ${dbName}`);
  }
  await withAdminPool(baseUrl, async (pool) => {
    await pool.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [dbName]
    );
    await pool.query(`DROP DATABASE IF EXISTS ${quoteIdent(dbName)}`);
  });
}

function quoteIdent(name) {
  if (!/^[a-z0-9_]+$/.test(name)) throw new Error('invalid identifier');
  return `"${name}"`;
}

function makePool(url) {
  return new Pool({
    connectionString: url,
    ssl: url.includes('localhost') ? false : { rejectUnauthorized: false },
  });
}

function runMigrate(url) {
  execSync('npm run migrate', {
    cwd: REPO_ROOT,
    env: { ...process.env, DATABASE_URL: url, NODE_ENV: 'development' },
    stdio: 'pipe',
  });
}

async function runCoreMigrations(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schedule_date_exclusion (
      child_id UUID NOT NULL,
      date DATE NOT NULL,
      activity_template_id UUID NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (child_id, date, activity_template_id)
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS schedule_date_exclusion_child_date_idx
      ON schedule_date_exclusion (child_id, date)
  `);
}

async function runMigrationsUpTo(url, stopBeforeMigrationName) {
  const pool = makePool(url);
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await runCoreMigrations(client);
    const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.js')).sort();
    const applied = await client.query('SELECT name FROM _migrations');
    const appliedNames = new Set(applied.rows.map((r) => r.name));

    for (const file of files) {
      const mod = require(path.join(MIGRATIONS_DIR, file));
      const name = mod.name || file.replace('.js', '');
      if (name === stopBeforeMigrationName) break;
      if (appliedNames.has(name)) continue;
      await client.query('BEGIN');
      try {
        await mod.up(client);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [name]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

async function tableRowCounts(client, tables) {
  const out = {};
  for (const table of tables) {
    const { rows } = await client.query(`SELECT COUNT(*)::bigint AS n FROM ${quoteIdent(table)}`);
    out[table] = Number(rows[0].n);
  }
  return out;
}

async function familyStableBusinessChecksum(client) {
  const { rows } = await client.query(
    `SELECT id::text, subscription_status, is_lifetime_free, COALESCE(rc_customer_id, '') AS rc
     FROM family ORDER BY id`
  );
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');
}

async function familySnapshotChecksum(client) {
  const { rows: cols } = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'family'
       AND column_name IN (
         'id', 'subscription_status', 'is_lifetime_free', 'rc_customer_id',
         'iap_last_event_timestamp_ms', 'iap_last_applied_product_id',
         'iap_last_applied_environment', 'iap_last_revenuecat_event_id', 'iap_last_event_type'
       )`
  );
  const names = cols.map((r) => r.column_name).sort();
  const selectList = names.map((c) => {
    if (c === 'id') return 'id::text';
    if (c === 'iap_last_event_timestamp_ms') return 'COALESCE(iap_last_event_timestamp_ms::text, \'\')';
    return `COALESCE(${c}::text, '')`;
  }).join(', ');
  const { rows } = await client.query(`SELECT ${selectList} FROM family ORDER BY id`);
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');
}

module.exports = {
  createDisposableDatabase,
  dropDisposableDatabase,
  runMigrate,
  runMigrationsUpTo,
  makePool,
  tableRowCounts,
  familyStableBusinessChecksum,
  familySnapshotChecksum,
  parseDatabaseUrl,
};
