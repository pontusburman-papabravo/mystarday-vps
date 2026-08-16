#!/usr/bin/env node
/**
 * Daily database backup + restore verification + safe retention.
 * POS: ops-only — no product surface changes.
 */
import fs from 'node:fs';
import { resolveDeployDatabaseUrl } from './lib/deploy-database-url.mjs';
import { captureDbIntegritySnapshot } from './lib/db-integrity-snapshot-core.mjs';
import {
  cleanupStalePartialFiles,
  createDatabaseBackup,
  withBackupLock,
} from './lib/db-backup-core.mjs';
import {
  buildRestoreTestDbName,
  runBackupRestoreTest,
} from './lib/backup-restore-test-core.mjs';
import { executeBackupPrune } from './lib/backup-prune-core.mjs';
import {
  refreshBackupInventoryStatus,
  writeBackupStatus,
} from './lib/backup-status-core.mjs';
import { uploadOffsiteBackupIfConfigured } from './lib/backup-offsite-core.mjs';
import { assertBackupToolchain } from './lib/backup-prerequisites.mjs';

const started = Date.now();

function logField(fields) {
  const line = Object.entries(fields)
    .map(([k, v]) => `${k}=${v == null ? '' : String(v)}`)
    .join(' ');
  console.error(`[daily-backup] ${line}`);
}

function parseArgs(argv) {
  const out = { skipPrune: false, dryRunPrune: false };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--skip-prune') out.skipPrune = true;
    else if (argv[i] === '--dry-run-prune') out.dryRunPrune = true;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  assertBackupToolchain();

  const { databaseUrl } = resolveDeployDatabaseUrl();
  const backupDir = process.env.APP_DB_BACKUP_DIR;
  if (!backupDir) throw new Error('APP_DB_BACKUP_DIR_MISSING');

  const snapshot = await captureDbIntegritySnapshot(databaseUrl, {
    label: 'daily-pre-backup',
  });

  let backupResult;
  let restoreResult = null;
  let offsiteResult = { skipped: true };
  let pruneResult = null;
  let finalStatus = 'FAILED';

  try {
    backupResult = await withBackupLock(backupDir, async () => {
      cleanupStalePartialFiles(backupDir);
      return createDatabaseBackup({
        type: 'daily',
        databaseUrl,
        backupDir,
        snapshot,
        env: process.env,
      });
    });

    logField({
      backup_type: 'daily',
      backup_filename: backupResult.metadata.backup_file,
      size_bytes: backupResult.metadata.backup_file_bytes,
      pg_dump_status: 'ok',
      archive_verify_status: 'ok',
      checksum_status: 'ok',
    });

    const targetDb = buildRestoreTestDbName();
    restoreResult = await runBackupRestoreTest(
      {
        backupFile: backupResult.dumpPath,
        targetDb,
        baselineSnapshot: snapshot,
      },
      process.env
    );

    logField({
      restore_status: 'ok',
      restore_target: targetDb,
      sanity_check_status: 'ok',
    });

    const meta = {
      ...backupResult.metadata,
      status: 'VERIFIED',
      restore_test_at_utc: new Date().toISOString(),
      restore_test_counts: restoreResult.counts,
    };
    fs.writeFileSync(backupResult.metaPath, JSON.stringify(meta, null, 2), { mode: 0o600 });

    offsiteResult = await uploadOffsiteBackupIfConfigured(
      {
        dumpPath: backupResult.dumpPath,
        metaPath: backupResult.metaPath,
        checksumPath: backupResult.checksumPath,
      },
      process.env
    );

    if (!args.skipPrune) {
      pruneResult = executeBackupPrune(backupDir, { dryRun: args.dryRunPrune });
      logField({
        pruned_count: pruneResult.deleted?.length || 0,
        prune_dry_run: args.dryRunPrune ? '1' : '0',
      });
    }

    finalStatus = 'VERIFIED';
    writeBackupStatus({
      last_daily_backup_at: new Date().toISOString(),
      last_daily_backup_status: 'VERIFIED',
      last_daily_backup_file: backupResult.metadata.backup_file,
      last_restore_test_at: new Date().toISOString(),
      last_restore_test_status: 'ok',
      last_offsite_backup_at: offsiteResult.skipped ? null : new Date().toISOString(),
      last_offsite_backup_status: offsiteResult.skipped ? 'skipped' : 'ok',
      final_status: finalStatus,
      duration_ms: Date.now() - started,
    });
    refreshBackupInventoryStatus(backupDir);

    logField({ final_status: finalStatus, duration_ms: Date.now() - started });
    console.log(backupResult.dumpPath);
  } catch (err) {
    writeBackupStatus({
      last_daily_backup_at: new Date().toISOString(),
      last_daily_backup_status: 'FAILED',
      last_restore_test_status: restoreResult ? 'failed' : 'not_run',
      final_status: 'FAILED',
      last_error: err.message,
      duration_ms: Date.now() - started,
    });
    logField({ final_status: 'FAILED', error: err.message });
    throw err;
  }
}

main().catch(() => process.exit(1));
