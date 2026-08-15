'use strict';

/**
 * Local/test-only repair for missing feature_flag rows from migration snapshotContract.
 * NEVER runs without validated disposable TEST_DATABASE_URL — fail closed.
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { parseDatabaseUrl, sanitizeDbMeta } = require('./flags.cjs');
const {
  assertDestructiveTestDatabaseAllowed,
  tryAssertDestructiveTestDatabaseAllowed,
} = require('../test-database-safety.cjs');

const ROOT = path.join(__dirname, '../../..');

function envForDatabaseUrl(databaseUrl, env = process.env) {
  return { ...env, TEST_DATABASE_URL: databaseUrl };
}

/**
 * Returns true only when databaseUrl is a validated disposable test database.
 * localhost alone is never sufficient.
 */
function isRepairAllowedDatabase(databaseUrl, env = process.env) {
  if (!databaseUrl) return false;
  return tryAssertDestructiveTestDatabaseAllowed(envForDatabaseUrl(databaseUrl, env)).ok;
}

function assertRepairAllowed(databaseUrl, env = process.env) {
  if (!databaseUrl) {
    const err = new Error('TEST_DATABASE_URL missing — cannot repair feature flags');
    err.code = 'REPAIR_REFUSED';
    throw err;
  }
  try {
    assertDestructiveTestDatabaseAllowed(envForDatabaseUrl(databaseUrl, env));
  } catch (err) {
    const refused = new Error(
      `Refusing feature_flag repair on non-disposable database (reason=${err.reason || err.message})`
    );
    refused.code = 'REPAIR_REFUSED';
    refused.meta = err.meta || sanitizeDbMeta(databaseUrl);
    throw refused;
  }
}

function pgClientConfig(databaseUrl) {
  const parsed = parseDatabaseUrl(databaseUrl);
  if (!parsed || parsed.invalid) return null;
  return {
    connectionString: databaseUrl,
    ssl: parsed.ssl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 8000,
    statement_timeout: 15000,
  };
}

/**
 * Idempotent INSERT of missing feature_flag rows from snapshotContract.featureFlagInserts.
 * ON CONFLICT DO NOTHING — never flips an existing flag.
 */
async function repairMissingFeatureFlagSeeds(databaseUrl, options = {}) {
  const env = options.env || process.env;
  assertRepairAllowed(databaseUrl, env);

  const cfg = pgClientConfig(databaseUrl);
  const client = new Client(cfg);
  const inserted = [];
  const skipped = [];

  try {
    await client.connect();

    const exists = await client.query(`SELECT to_regclass('public.feature_flag') AS t`);
    if (!exists.rows[0]?.t) {
      return { repaired: false, reason: 'feature_flag_table_missing', inserted, skipped };
    }

    const migrationsDir = path.join(ROOT, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      return { repaired: false, reason: 'migrations_dir_missing', inserted, skipped };
    }

    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.js')).sort();

    for (const file of files) {
      let migration;
      try {
        migration = require(path.join(migrationsDir, file));
      } catch {
        continue;
      }
      const inserts = migration.snapshotContract?.featureFlagInserts;
      if (!Array.isArray(inserts) || !inserts.length) continue;
      for (const row of inserts) {
        if (!row || !row.key) continue;
        const result = await client.query(
          `INSERT INTO feature_flag (key, enabled, description)
           VALUES ($1, $2, $3)
           ON CONFLICT (key) DO NOTHING
           RETURNING key`,
          [row.key, Boolean(row.enabled), `seeded from ${migration.name || file}`]
        );
        if (result.rowCount > 0) inserted.push(row.key);
        else skipped.push(row.key);
      }
    }

    return {
      repaired: inserted.length > 0,
      inserted,
      skipped: skipped.length,
      meta: sanitizeDbMeta(databaseUrl),
    };
  } finally {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
  }
}

module.exports = {
  isRepairAllowedDatabase,
  assertRepairAllowed,
  repairMissingFeatureFlagSeeds,
};
