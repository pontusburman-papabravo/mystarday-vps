'use strict';

/**
 * Local/test-only repair for missing feature_flag rows from migration snapshotContract.
 * NEVER runs against non-local databases — fail closed.
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { parseDatabaseUrl, sanitizeDbMeta } = require('./flags.cjs');

const ROOT = path.join(__dirname, '../../..');

/**
 * Returns true only when the database URL is unambiguously local/test-safe.
 * Fail closed: remote hosts or invalid URLs → false.
 */
function isRepairAllowedDatabase(databaseUrl) {
  const meta = sanitizeDbMeta(databaseUrl);
  if (!meta.present || meta.invalid || !meta.isLocal) return false;
  return true;
}

function assertRepairAllowed(databaseUrl) {
  if (!databaseUrl) {
    const err = new Error('DATABASE_URL missing — cannot repair feature flags');
    err.code = 'REPAIR_REFUSED';
    throw err;
  }
  if (!isRepairAllowedDatabase(databaseUrl)) {
    const meta = sanitizeDbMeta(databaseUrl);
    const err = new Error(
      `Refusing feature_flag repair on non-local database (host=${meta.host || 'unknown'})`
    );
    err.code = 'REPAIR_REFUSED';
    err.meta = meta;
    throw err;
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
async function repairMissingFeatureFlagSeeds(databaseUrl) {
  assertRepairAllowed(databaseUrl);

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
