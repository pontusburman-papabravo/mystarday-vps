'use strict';

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const REPO_ROOT = path.join(__dirname, '../..');
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'migrations');

const DISPOSABLE_DB_NAME_PATTERNS = [
  /^stjarndag_test$/i,
  /^stjarndag_test_\d+$/i,
  /^stjarndag_test_\d+_[a-z0-9]+$/i,
  /^stjarndag_migrate_gate_\d+_\d+$/i,
  /^integrity_restore_[a-z0-9_]+$/i,
  /^stjarndag_clean_\d+$/i,
];

function databaseNameFromUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return decodeURIComponent((parsed.pathname || '').replace(/^\//, ''));
  } catch {
    return null;
  }
}

function isDisposableTestDatabaseName(dbName) {
  if (!dbName || typeof dbName !== 'string') return false;
  return DISPOSABLE_DB_NAME_PATTERNS.some((re) => re.test(dbName));
}

function assertDisposableDatabaseName(dbName) {
  if (!isDisposableTestDatabaseName(dbName)) {
    throw new Error(
      `TEST_DATABASE_NOT_DISPOSABLE:${dbName || '<missing>'} — use a dedicated test DB ` +
        '(e.g. stjarndag_test_<timestamp> or stjarndag_clean_<timestamp>)'
    );
  }
}

function assertDisposableDatabaseUrl(url) {
  const name = databaseNameFromUrl(url);
  assertDisposableDatabaseName(name);
  return name;
}

function listFolderMigrationNames() {
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.js')).sort();
  return files.map((file) => {
    const filePath = path.join(MIGRATIONS_DIR, file);
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const mod = require(filePath);
    return mod.name || file.replace('.js', '');
  });
}

async function assertMigrationsMatchFilesystem(clientOrPool) {
  let client = clientOrPool;
  let releaseClient = false;
  if (typeof clientOrPool.connect === 'function' && typeof clientOrPool.release !== 'function') {
    client = await clientOrPool.connect();
    releaseClient = true;
  }
  try {
    const { rows } = await client.query('SELECT name FROM _migrations ORDER BY id');
    const applied = rows.map((r) => r.name);
    const folder = new Set(listFolderMigrationNames());
    const orphan = applied.filter((name) => !folder.has(name));
    if (orphan.length > 0) {
      const err = new Error(
        `TEST_DATABASE_SCHEMA_FROM_DIFFERENT_BRANCH: _migrations rows without folder file: ${orphan.join(', ')}`
      );
      err.code = 'TEST_DATABASE_SCHEMA_FROM_DIFFERENT_BRANCH';
      throw err;
    }
  } finally {
    if (releaseClient) client.release();
  }
}

function adminPostgresUrl(databaseUrl) {
  const parsed = new URL(databaseUrl);
  parsed.pathname = '/postgres';
  return parsed.toString();
}

function databaseUrlWithName(databaseUrl, dbName) {
  const parsed = new URL(databaseUrl);
  parsed.pathname = `/${dbName}`;
  return parsed.toString();
}

async function createDisposableDatabase(adminDatabaseUrl, dbName) {
  const pool = new Pool({
    connectionString: adminPostgresUrl(adminDatabaseUrl),
    ssl: adminDatabaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
  });
  const client = await pool.connect();
  try {
    await client.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [dbName]
    );
    await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    await client.query(`CREATE DATABASE "${dbName}"`);
  } finally {
    client.release();
    await pool.end();
  }
  return databaseUrlWithName(adminDatabaseUrl, dbName);
}

async function dropDisposableDatabase(adminDatabaseUrl, dbName) {
  const pool = new Pool({
    connectionString: adminPostgresUrl(adminDatabaseUrl),
    ssl: adminDatabaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
  });
  const client = await pool.connect();
  try {
    await client.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [dbName]
    );
    await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
  } finally {
    client.release();
    await pool.end();
  }
}

function generateDisposableDatabaseName(prefix = 'stjarndag_test') {
  return `${prefix}_${Date.now()}_${process.pid}`;
}

module.exports = {
  DISPOSABLE_DB_NAME_PATTERNS,
  databaseNameFromUrl,
  isDisposableTestDatabaseName,
  assertDisposableDatabaseName,
  assertDisposableDatabaseUrl,
  listFolderMigrationNames,
  assertMigrationsMatchFilesystem,
  adminPostgresUrl,
  createDisposableDatabase,
  dropDisposableDatabase,
  generateDisposableDatabaseName,
};
