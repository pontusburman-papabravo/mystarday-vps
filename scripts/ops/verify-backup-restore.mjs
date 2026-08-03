#!/usr/bin/env node
/**
 * Restore rehearsal to a disposable database only — never production.
 */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { assertDisposableRestoreDatabaseName } from './lib/backup-gate-core.mjs';
import { captureDbIntegritySnapshot } from './lib/db-integrity-snapshot-core.mjs';
import { compareDbSnapshots } from './lib/compare-snapshots.mjs';
import {
  createDisposableDatabase,
  dropDisposableDatabase,
} from './lib/disposable-db-admin.mjs';

function parseArgs(argv) {
  const out = {
    backupFile: null,
    targetDb: null,
    baselineSnapshot: null,
    runMigrate: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--backup') out.backupFile = argv[++i];
    else if (argv[i] === '--target-db') out.targetDb = argv[++i];
    else if (argv[i] === '--baseline-snapshot') out.baselineSnapshot = argv[++i];
    else if (argv[i] === '--run-migrate') out.runMigrate = true;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.backupFile || !args.targetDb) {
    console.error('Usage: verify-backup-restore.mjs --backup <dump> --target-db <name> [--baseline-snapshot <json>] [--run-migrate]');
    process.exit(1);
  }
  if (!fs.existsSync(args.backupFile)) {
    throw new Error('BACKUP_FILE_NOT_FOUND');
  }

  assertDisposableRestoreDatabaseName(args.targetDb);

  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) throw new Error('DATABASE_URL_MISSING');

  const protectedName = process.env.PROTECTED_DATABASE_NAME || null;
  await createDisposableDatabase(args.targetDb, { protectedName });

  const targetUrl = new URL(baseUrl);
  targetUrl.pathname = `/${args.targetDb}`;

  const restore = spawnSync(
    'pg_restore',
    ['--no-owner', '--no-acl', '-d', targetUrl.toString(), args.backupFile],
    { encoding: 'utf8' }
  );
  if (restore.status !== 0) {
    throw new Error(`PG_RESTORE_FAILED:${restore.stderr || restore.stdout}`);
  }

  if (args.runMigrate) {
    const mig = spawnSync('npm', ['run', 'migrate'], {
      encoding: 'utf8',
      env: { ...process.env, DATABASE_URL: targetUrl.toString(), NODE_ENV: 'development' },
      cwd: process.cwd(),
    });
    if (mig.status !== 0) {
      throw new Error(`MIGRATE_ON_RESTORE_FAILED:${mig.stderr || mig.stdout}`);
    }
  }

  const restoredSnapshot = await captureDbIntegritySnapshot(targetUrl.toString(), {
    label: 'post-restore',
  });

  if (args.baselineSnapshot) {
    const baseline = JSON.parse(fs.readFileSync(args.baselineSnapshot, 'utf8'));
    const cmp = compareDbSnapshots(baseline, restoredSnapshot, {
      allowMigrationDrift: true,
      ignoreIdentityHash: true,
    });
    if (!cmp.ok) {
      console.error(JSON.stringify(cmp, null, 2));
      throw new Error('RESTORE_SNAPSHOT_DRIFT');
    }
  }

  console.error(`[restore-rehearsal] OK database=${args.targetDb}`);
}

main().catch((err) => {
  console.error(`[restore-rehearsal] FAILED: ${err.message}`);
  process.exit(1);
});
