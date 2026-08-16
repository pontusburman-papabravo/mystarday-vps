'use strict';

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import pg from 'pg';
import { assertDisposableRestoreDatabaseName } from './backup-gate-core.mjs';
import { captureDbIntegritySnapshot } from './db-integrity-snapshot-core.mjs';
import { compareDbSnapshots } from './compare-snapshots.mjs';
import {
  createDisposableDatabase,
  dropDisposableDatabase,
} from './disposable-db-admin.mjs';
import { verifyPrecreatedRestoreTarget } from './restore-target-verify.mjs';
import { verifyChecksumSidecar, verifyPgRestoreList } from './db-backup-core.mjs';
import { PG_RESTORE_ARGS } from './verify-backup-restore-core.mjs';

const { Pool } = pg;

/** Tables that must be readable after restore. */
export const SANITY_TABLES = [
  'family',
  'parent',
  'child',
  'parent_child',
  'weekly_schedule',
  'daily_log',
  'reward',
  '_migrations',
];

/**
 * @param {string} targetUrl
 * @param {object} [baselineCounts]
 */
export async function runSqlSanityChecks(targetUrl, baselineCounts = {}) {
  const pool = new Pool({
    connectionString: targetUrl,
    ssl: targetUrl.includes('localhost') || targetUrl.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false },
  });
  const client = await pool.connect();
  const counts = {};
  try {
    for (const table of SANITY_TABLES) {
      const exists = await client.query(
        `SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = $1`,
        [table]
      );
      if (exists.rows.length === 0) {
        throw new Error(`SANITY_TABLE_MISSING:${table}`);
      }
      const { rows } = await client.query(`SELECT COUNT(*)::bigint AS n FROM "${table}"`);
      counts[table] = Number(rows[0].n);
    }

    if (baselineCounts.family != null && counts.family < baselineCounts.family) {
      throw new Error('SANITY_FAMILY_COUNT_DRIFT');
    }
    if (baselineCounts.parent != null && counts.parent < baselineCounts.parent) {
      throw new Error('SANITY_PARENT_COUNT_DRIFT');
    }
    if (baselineCounts.child != null && counts.child < baselineCounts.child) {
      throw new Error('SANITY_CHILD_COUNT_DRIFT');
    }
    if (counts.family === 0 && (baselineCounts.family ?? 0) > 0) {
      throw new Error('SANITY_EMPTY_FAMILY_TABLE');
    }
    if (counts._migrations === 0) {
      throw new Error('SANITY_MIGRATIONS_EMPTY');
    }
  } finally {
    client.release();
    await pool.end();
  }
  return counts;
}

/**
 * @param {object} opts
 * @param {string} opts.backupFile
 * @param {string} opts.targetDb
 * @param {object} [opts.baselineSnapshot]
 * @param {NodeJS.ProcessEnv} [opts.env]
 */
export async function runBackupRestoreTest(opts, env = process.env) {
  const { backupFile, targetDb, baselineSnapshot } = opts;
  if (!backupFile || !targetDb) {
    throw new Error('RESTORE_TEST_ARGS_MISSING');
  }
  if (!fs.existsSync(backupFile)) {
    throw new Error('BACKUP_FILE_NOT_FOUND');
  }

  assertDisposableRestoreDatabaseName(targetDb);
  verifyChecksumSidecar(backupFile);
  verifyPgRestoreList(backupFile);

  const baseUrl = env.DATABASE_URL;
  if (!baseUrl) throw new Error('DATABASE_URL_MISSING');

  const protectedName = env.PROTECTED_DATABASE_NAME || null;
  let targetUrl;
  let lifecycle = 'external';
  let created = false;

  if (env.DATABASE_ADMIN_URL) {
    lifecycle = 'managed';
    await createDisposableDatabase(targetDb, { protectedName, lifecycle: 'managed' });
    created = true;
    const u = new URL(baseUrl);
    u.pathname = `/${targetDb}`;
    targetUrl = u.toString();
  } else {
    if (env.DATABASE_ADMIN_URL) {
      throw new Error('DATABASE_ADMIN_URL_FORBIDDEN_IN_EXTERNAL_LIFECYCLE');
    }
    await createDisposableDatabase(targetDb, { protectedName, lifecycle: 'sudo' });
    created = true;
    const verified = await verifyPrecreatedRestoreTarget(baseUrl, targetDb, { protectedName });
    targetUrl = verified.targetUrl;
  }

  try {
    const restore = spawnSync(
      'pg_restore',
      [...PG_RESTORE_ARGS, '-d', targetUrl, backupFile],
      { encoding: 'utf8' }
    );
    if (restore.status !== 0) {
      throw new Error(`PG_RESTORE_FAILED:${restore.stderr || restore.stdout}`);
    }

    const baselineCounts = baselineSnapshot?.tables
      ? Object.fromEntries(
          Object.entries(baselineSnapshot.tables)
            .filter(([, v]) => v?.exists)
            .map(([k, v]) => [k, v.row_count])
        )
      : {};

    const counts = await runSqlSanityChecks(targetUrl, baselineCounts);

    if (baselineSnapshot) {
      const restoredSnapshot = await captureDbIntegritySnapshot(targetUrl, {
        label: 'post-restore-test',
      });
      const cmp = compareDbSnapshots(baselineSnapshot, restoredSnapshot, {
        allowMigrationDrift: true,
        ignoreIdentityHash: true,
      });
      if (!cmp.ok) {
        throw new Error('RESTORE_SNAPSHOT_DRIFT');
      }
    }

    return {
      targetDb,
      lifecycle,
      counts,
      verified: true,
    };
  } finally {
    if (created) {
      try {
        await dropDisposableDatabase(targetDb, {
          protectedName,
          lifecycle: lifecycle === 'managed' ? 'managed' : 'sudo',
        });
      } catch {
        // log at caller — do not mask restore failure
      }
    }
  }
}

/**
 * @param {string} prefix
 */
export function buildRestoreTestDbName(prefix = 'integrity_restore_daily_') {
  const ts = Date.now().toString(36);
  const name = `${prefix}${ts}`;
  if (name.length > 63) {
    return `${prefix}${ts.slice(0, 63 - prefix.length)}`;
  }
  return name;
}
