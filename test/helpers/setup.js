/**
 * Test setup helpers.
 * Provides mock DB injection so tests run without a live connection.
 * For tests that need real DB access, use setupTestDb() with DATABASE_URL.
 */

'use strict';

const path = require('path');
const { execSync } = require('child_process');
const { Pool } = require('pg');
const { acquireDbTestLock, isMockDatabaseUrl } = require('./db-test-lock.js');

const REPO_ROOT = path.join(__dirname, '../..');
let migrationsAppliedForUrl = null;

/**
 * Connect to a real DATABASE_URL, run migrations once per URL, optionally
 * truncate public tables (except _migrations), and return query + cleanup.
 *
 * Returns { skip: true } when DATABASE_URL is missing or mock — integration
 * tests should call t.skip() in that case.
 *
 * Holds a PostgreSQL advisory lock for the test lifetime so parallel test
 * files cannot migrate/truncate/wipe the shared schema concurrently.
 */
async function setupTestDb(options = {}) {
  const url = process.env.DATABASE_URL;
  if (isMockDatabaseUrl(url)) {
    return {
      skip: true,
      query: null,
      pool: null,
      truncate: async () => {},
      cleanup: async () => {},
    };
  }

  const releaseLock = await acquireDbTestLock();

  try {
    if (migrationsAppliedForUrl !== url) {
      const skipMigrate = process.env.TEST_SKIP_MIGRATE === '1' || process.env.TEST_SKIP_MIGRATE === 'true';
      if (!skipMigrate) {
        execSync('npm run migrate', {
          cwd: REPO_ROOT,
          env: { ...process.env, DATABASE_URL: url },
          stdio: 'pipe',
        });
      }
      migrationsAppliedForUrl = url;
    }

    const pool = new Pool({
      connectionString: url,
      ssl: url.includes('localhost') ? false : { rejectUnauthorized: false },
    });

    async function truncatePublicTables() {
      const { rows } = await pool.query(`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename NOT IN ('_migrations')
      `);
      if (rows.length === 0) return;
      const tables = rows.map((r) => `"${r.tablename}"`).join(', ');
      await pool.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
    }

    if (options.truncate !== false) {
      await truncatePublicTables();
    }

    return {
      skip: false,
      pool,
      query: (text, params) => pool.query(text, params),
      truncate: truncatePublicTables,
      cleanup: async () => {
        await pool.end();
        await releaseLock();
      },
    };
  } catch (err) {
    await releaseLock();
    throw err;
  }
}

/**
 * Inject a mock db module into require.cache before loading any module
 * that depends on src/lib/db.
 *
 * Returns a control object with setRows/setQuery to configure mock behavior,
 * and a restore() to undo the injection.
 */
function injectMockDb() {
  // Must set DATABASE_URL before any module tries to load db.js
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'REDACTED/mock_test';
  }

  let mockQueryFn = async () => ({ rows: [] });

  const mockDb = {
    query: async (text, params) => mockQueryFn(text, params),
    getClient: async () => {
      const client = {
        query: async (text, params) => mockQueryFn(text, params),
        release: () => {},
      };
      return client;
    },
    pool: { query: async (text, params) => mockQueryFn(text, params) },
  };

  const dbPath = require.resolve(path.join(__dirname, '../../src/lib/db'));
  const original = require.cache[dbPath];

  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: mockDb,
    children: [],
    parent: null,
    paths: [],
  };

  return {
    setRows(rows) { mockQueryFn = async () => ({ rows }); },
    setQuery(fn) { mockQueryFn = fn; },
    restore() {
      if (original) {
        require.cache[dbPath] = original;
      } else {
        delete require.cache[dbPath];
      }
    },
  };
}

/**
 * Fake Express res object for middleware testing.
 * Captures the first status/json call so you can assert on it.
 */
function makeFakeRes() {
  let statusCode;
  let body;
  let resolved = false;

  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    json(data) {
      if (!resolved) { body = data; resolved = true; }
      return res;
    },
    get statusCode() { return statusCode; },
    get body() { return body; },
  };
  return res;
}

/**
 * Run Express middleware and return { next, status, body }.
 */
function runMiddleware(middleware, req) {
  return new Promise((resolve) => {
    let statusCode;
    const res = {
      status(code) { statusCode = code; return res; },
      json(data) { resolve({ next: false, status: statusCode, body: data }); return res; },
    };
    middleware(req, res, () => resolve({ next: true }));
  });
}

module.exports = { injectMockDb, makeFakeRes, runMiddleware, setupTestDb, isMockDatabaseUrl };
