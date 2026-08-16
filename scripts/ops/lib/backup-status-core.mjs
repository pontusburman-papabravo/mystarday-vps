import fs from 'node:fs';
import path from 'node:path';
import { listBackupFiles } from './backup-prune-core.mjs';

export const DEFAULT_STATUS_PATH = '/var/lib/app-db-backups/backup-status.json';

/**
 * @param {object} partial
 * @param {string} [statusPath]
 */
export function writeBackupStatus(partial, statusPath = process.env.BACKUP_STATUS_PATH || DEFAULT_STATUS_PATH) {
  const dir = path.dirname(statusPath);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  let existing = {};
  if (fs.existsSync(statusPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
    } catch {
      existing = {};
    }
  }
  const next = {
    ...existing,
    updated_at_utc: new Date().toISOString(),
    ...partial,
  };
  fs.writeFileSync(statusPath, JSON.stringify(next, null, 2), { mode: 0o600 });
  return next;
}

/**
 * @param {string} backupDir
 * @param {string} [statusPath]
 */
export function refreshBackupInventoryStatus(backupDir, statusPath) {
  const files = listBackupFiles(backupDir);
  const daily = files.filter((f) => f.kind === 'daily');
  const predeploy = files.filter(
    (f) => f.kind === 'predeploy' || f.kind === 'legacy_predeploy'
  );
  const newest = files[0] || null;
  const oldest = files.length ? files[files.length - 1] : null;

  return writeBackupStatus(
    {
      backup_count: files.length,
      daily_backup_count: daily.length,
      predeploy_backup_count: predeploy.length,
      newest_backup_at: newest?.createdAt?.toISOString() || null,
      oldest_backup_at: oldest?.createdAt?.toISOString() || null,
      last_daily_backup_at: daily[0]?.createdAt?.toISOString() || null,
      last_predeploy_backup_at: predeploy[0]?.createdAt?.toISOString() || null,
    },
    statusPath
  );
}

/**
 * @param {string} [statusPath]
 */
export function readBackupStatus(statusPath = process.env.BACKUP_STATUS_PATH || DEFAULT_STATUS_PATH) {
  if (!fs.existsSync(statusPath)) return null;
  return JSON.parse(fs.readFileSync(statusPath, 'utf8'));
}

/**
 * @param {Date} [now]
 * @param {string} [statusPath]
 */
export function assertRecentDailyBackup(now = new Date(), statusPath) {
  const status = readBackupStatus(statusPath);
  if (!status?.last_daily_backup_at) {
    throw new Error('NO_DAILY_BACKUP_RECORDED');
  }
  const last = new Date(status.last_daily_backup_at);
  const hours = (now.getTime() - last.getTime()) / (60 * 60 * 1000);
  if (hours > 30) {
    throw new Error('DAILY_BACKUP_STALE');
  }
  return status;
}
