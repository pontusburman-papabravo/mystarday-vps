#!/usr/bin/env node
/**
 * Weekly restore test against an older backup from the retention window.
 */
import fs from 'node:fs';
import { resolveDeployDatabaseUrl } from './lib/deploy-database-url.mjs';
import { listBackupFiles } from './lib/backup-prune-core.mjs';
import {
  buildRestoreTestDbName,
  runBackupRestoreTest,
} from './lib/backup-restore-test-core.mjs';
import { writeBackupStatus } from './lib/backup-status-core.mjs';
import {
  resolveBackupMetaPath,
  verifyChecksumSidecar,
  withBackupLock,
} from './lib/db-backup-core.mjs';

const TARGET_AGES_DAYS = [7, 14, 21, 27];

function pickHistoricalBackup(files, now = new Date()) {
  const candidates = files.filter(
    (f) => f.kind === 'daily' || f.kind === 'predeploy' || f.kind === 'legacy_predeploy'
  );
  if (candidates.length === 0) return null;

  const week = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));
  const targetDays = TARGET_AGES_DAYS[week % TARGET_AGES_DAYS.length];
  const targetMs = now.getTime() - targetDays * 24 * 60 * 60 * 1000;

  let best = null;
  let bestDelta = Infinity;
  for (const f of candidates) {
    if (!f.createdAt) continue;
    const delta = Math.abs(f.createdAt.getTime() - targetMs);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = f;
    }
  }
  return best || candidates[candidates.length - 1];
}

async function main() {
  const backupDir = process.env.APP_DB_BACKUP_DIR;
  if (!backupDir) throw new Error('APP_DB_BACKUP_DIR_MISSING');

  resolveDeployDatabaseUrl({ mutateEnv: false });

  await withBackupLock(
    backupDir,
    async () => {
      const files = listBackupFiles(backupDir);
      const chosen = pickHistoricalBackup(files);
      if (!chosen) throw new Error('NO_HISTORICAL_BACKUP_AVAILABLE');

      verifyChecksumSidecar(chosen.path);
      const metaPath = resolveBackupMetaPath(chosen.path);
      let baselineSnapshot = null;
      if (fs.existsSync(metaPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (meta.table_counts) {
          baselineSnapshot = {
            tables: Object.fromEntries(
              Object.entries(meta.table_counts).map(([table, count]) => [
                table,
                { exists: true, row_count: count },
              ])
            ),
          };
        }
      }

      const targetDb = buildRestoreTestDbName('integrity_restore_weekly_');
      const result = await runBackupRestoreTest(
        {
          backupFile: chosen.path,
          targetDb,
          baselineSnapshot,
        },
        process.env
      );

      if (result.cleanupFailed) {
        console.error(
          `[weekly-restore-test] cleanup_failed target=${targetDb} error=${result.cleanupError}`
        );
      }

      writeBackupStatus({
        last_weekly_historical_restore_at: new Date().toISOString(),
        last_weekly_historical_restore_status: 'ok',
        last_weekly_historical_backup_file: chosen.name,
        last_weekly_historical_target_days:
          TARGET_AGES_DAYS[
            Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)) % TARGET_AGES_DAYS.length
          ],
      });

      console.error(
        `[weekly-restore-test] OK backup=${chosen.name} target=${result.targetDb}`
      );
    },
    'weekly-restore-test'
  );
}

main().catch((err) => {
  writeBackupStatus({
    last_weekly_historical_restore_at: new Date().toISOString(),
    last_weekly_historical_restore_status: 'failed',
    last_error: err.message,
  });
  console.error(`[weekly-restore-test] ${err.message}`);
  process.exit(1);
});
