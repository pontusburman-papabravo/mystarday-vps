'use strict';

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { assertDisposableRestoreDatabaseName } from './backup-gate-core.mjs';
import { captureDbIntegritySnapshot } from './db-integrity-snapshot-core.mjs';
import { compareDbSnapshots } from './compare-snapshots.mjs';
import { createDisposableDatabase } from './disposable-db-admin.mjs';
import { verifyPrecreatedRestoreTarget } from './restore-target-verify.mjs';

/** @typedef {'external' | 'managed'} DatabaseLifecycle */

/**
 * pg_restore: --no-owner --no-acl avoid re-applying production role ownership/privileges
 * from the custom dump; objects are created under the connected app role (DB owner).
 */
export const PG_RESTORE_ARGS = ['--no-owner', '--no-acl'];

/**
 * @param {string[]} argv
 */
export function parseVerifyBackupRestoreArgs(argv) {
  const out = {
    backupFile: null,
    targetDb: null,
    baselineSnapshot: null,
    runMigrate: false,
    databaseLifecycle: null,
  };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--backup') out.backupFile = argv[++i];
    else if (argv[i] === '--target-db') out.targetDb = argv[++i];
    else if (argv[i] === '--baseline-snapshot') out.baselineSnapshot = argv[++i];
    else if (argv[i] === '--run-migrate') out.runMigrate = true;
    else if (argv[i] === '--database-lifecycle') out.databaseLifecycle = argv[++i];
    else if (argv[i] === '--target-precreated') out.databaseLifecycle = 'external';
  }
  return out;
}

/**
 * @param {ReturnType<typeof parseVerifyBackupRestoreArgs>} args
 */
export function assertLifecycleExplicit(args) {
  if (args.databaseLifecycle !== 'external' && args.databaseLifecycle !== 'managed') {
    throw new Error('DATABASE_LIFECYCLE_REQUIRED: pass --database-lifecycle external|managed');
  }
}

/**
 * @param {ReturnType<typeof parseVerifyBackupRestoreArgs>} args
 * @param {NodeJS.ProcessEnv} env
 */
export async function runVerifyBackupRestore(args, env = process.env) {
  if (!args.backupFile || !args.targetDb) {
    throw new Error('USAGE: --backup and --target-db required');
  }
  assertLifecycleExplicit(args);
  assertLifecycleExplicit(args);
  if (!fs.existsSync(args.backupFile)) {
    throw new Error('BACKUP_FILE_NOT_FOUND');
  }
  assertDisposableRestoreDatabaseName(args.targetDb);

  const baseUrl = env.DATABASE_URL;
  if (!baseUrl) throw new Error('DATABASE_URL_MISSING');

  const protectedName = env.PROTECTED_DATABASE_NAME || null;
  let targetUrl;

  if (args.databaseLifecycle === 'external') {
    if (env.DATABASE_ADMIN_URL) {
      throw new Error('DATABASE_ADMIN_URL_FORBIDDEN_IN_EXTERNAL_LIFECYCLE');
    }
    const verified = await verifyPrecreatedRestoreTarget(baseUrl, args.targetDb, { protectedName });
    targetUrl = verified.targetUrl;
  } else {
    if (!env.DATABASE_ADMIN_URL) {
      throw new Error('DATABASE_ADMIN_URL_REQUIRED_FOR_MANAGED_LIFECYCLE');
    }
    await createDisposableDatabase(args.targetDb, {
      protectedName,
      lifecycle: 'managed',
    });
    const u = new URL(baseUrl);
    u.pathname = `/${args.targetDb}`;
    targetUrl = u.toString();
  }

  const restore = spawnSync(
    'pg_restore',
    [...PG_RESTORE_ARGS, '-d', targetUrl, args.backupFile],
    { encoding: 'utf8' }
  );
  if (restore.status !== 0) {
    throw new Error(`PG_RESTORE_FAILED:${restore.stderr || restore.stdout}`);
  }

  if (args.runMigrate) {
    const mig = spawnSync('npm', ['run', 'migrate'], {
      encoding: 'utf8',
      env: { ...env, DATABASE_URL: targetUrl, NODE_ENV: 'development' },
      cwd: process.cwd(),
    });
    if (mig.status !== 0) {
      throw new Error(`MIGRATE_ON_RESTORE_FAILED:${mig.stderr || mig.stdout}`);
    }
  }

  const restoredSnapshot = await captureDbIntegritySnapshot(targetUrl, {
    label: 'post-restore',
  });

  if (args.baselineSnapshot) {
    const baseline = JSON.parse(fs.readFileSync(args.baselineSnapshot, 'utf8'));
    const cmp = compareDbSnapshots(baseline, restoredSnapshot, {
      allowMigrationDrift: true,
      ignoreIdentityHash: true,
    });
    if (!cmp.ok) {
      throw new Error('RESTORE_SNAPSHOT_DRIFT');
    }
  }

  return { targetDb: args.targetDb, targetUrl, lifecycle: args.databaseLifecycle };
}
