/**
 * Test setup helpers.
 * Provides mock DB injection so tests run without a live connection.
 * For tests that need real DB access, use setupTestDb() with TEST_DATABASE_URL.
 */

'use strict';

const path = require('path');
const { execSync } = require('child_process');
const { Pool } = require('pg');
const { acquireDbTestLock, isMockDatabaseUrl } = require('./db-test-lock.js');
const {
  assertDestructiveTestDatabaseAllowed,
  resolveApplicationDatabaseUrl,
} = require('../../scripts/lib/test-database-safety.cjs');

const REPO_ROOT = path.join(__dirname, '../..');

/**
 * Connect to validated TEST_DATABASE_URL only — never application DATABASE_URL.
 * Runs fail-closed safety assertion before lock, migrate, pool, or TRUNCATE.
 */
async function setupTestDb(options = {}) {
  const applicationUrl = resolveApplicationDatabaseUrl(process.env);
  if (applicationUrl && !process.env.APPLICATION_DATABASE_URL) {
    process.env.APPLICATION_DATABASE_URL = applicationUrl;
  }

  let testDatabaseUrl;
  try {
    ({ testDatabaseUrl } = assertDestructiveTestDatabaseAllowed(process.env));
  } catch (err) {
    err.message = `[setupTestDb] ${err.message}`;
    throw err;
  }

  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.TEST_DATABASE_VALIDATED = '1';

  if (isMockDatabaseUrl(testDatabaseUrl)) {
    return {
      skip: true,
      query: null,
      pool: null,
      truncate: async () => {},
      cleanup: async () => {},
    };
  }

  const releaseLock = await acquireDbTestLock(testDatabaseUrl);

  try {
    assertDestructiveTestDatabaseAllowed(process.env);

    const { buildDestructiveTestChildEnv } = require('../../scripts/lib/test-database-safety.cjs');

    if (global.__setupTestDbMigrationsAppliedForUrl !== testDatabaseUrl) {
      const skipMigrate = process.env.TEST_SKIP_MIGRATE === '1' || process.env.TEST_SKIP_MIGRATE === 'true';
      if (!skipMigrate) {
        execSync('npm run migrate', {
          cwd: REPO_ROOT,
          env: buildDestructiveTestChildEnv(process.env),
          stdio: 'pipe',
        });
        const { repairMissingFeatureFlagSeeds } = require('../../scripts/lib/pre-public-release-gate/local-flag-repair.cjs');
        await repairMissingFeatureFlagSeeds(testDatabaseUrl);
      }
      global.__setupTestDbMigrationsAppliedForUrl = testDatabaseUrl;
    }

    assertDestructiveTestDatabaseAllowed(process.env);

    const pool = new Pool({
      connectionString: testDatabaseUrl,
      ssl: testDatabaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
    });

    async function truncatePublicTables() {
      assertDestructiveTestDatabaseAllowed(process.env);
      const { rows } = await pool.query(`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename NOT IN ('_migrations')
      `);
      if (rows.length === 0) return;
      const tables = rows.map((r) => `"${r.tablename}"`).join(', ');
      const sql = `TRUNCATE ${tables} RESTART IDENTITY CASCADE`;
      const maxAttempts = 4;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await pool.query(sql);
          return;
        } catch (err) {
          if (err.code === '40P01' && attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 25 * attempt));
            continue;
          }
          throw err;
        }
      }
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
 */
function injectMockDb() {
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
