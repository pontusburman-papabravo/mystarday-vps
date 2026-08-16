import fs from 'node:fs';
import path from 'node:path';
import {
  classifyBackupFilename,
  DAILY_RETENTION_DAYS,
  PREDEPLOY_MIN_KEEP,
  PREDEPLOY_MAX_AGE_DAYS,
  DUMP_SUFFIX,
  relatedBackupArtifacts,
} from './db-backup-core.mjs';

const PROTECTED_PREFIXES = ['incident_', 'pre_cutover_', 'manual_keep_'];

/**
 * @param {string} name
 */
export function isProtectedBackupName(name) {
  const base = path.basename(name, DUMP_SUFFIX);
  return PROTECTED_PREFIXES.some((p) => base.startsWith(p));
}

/**
 * @param {string} backupDir
 * @returns {Array<{ path: string, kind: string, createdAt: Date | null, mtimeMs: number }>}
 */
export function listBackupFiles(backupDir) {
  if (!fs.existsSync(backupDir)) return [];
  const entries = [];
  for (const name of fs.readdirSync(backupDir)) {
    if (!name.endsWith(DUMP_SUFFIX)) continue;
    if (name.endsWith('.partial')) continue;
    const full = path.join(backupDir, name);
    let stat;
    try {
      stat = fs.lstatSync(full);
      if (!stat.isFile()) continue;
    } catch {
      continue;
    }
    const classified = classifyBackupFilename(name);
    const createdAt =
      classified.createdAt || (stat.mtime ? new Date(stat.mtime) : null);
    entries.push({
      path: full,
      name,
      kind: classified.kind,
      createdAt,
      mtimeMs: stat.mtimeMs,
    });
  }
  return entries.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

/**
 * @param {Date | null} createdAt
 * @param {number} days
 * @param {Date} [now]
 */
export function isOlderThanDays(createdAt, days, now = new Date()) {
  if (!createdAt) return false;
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return createdAt.getTime() < cutoff;
}

/**
 * @param {string} backupDir
 * @param {object} [opts]
 * @param {boolean} [opts.dryRun]
 * @param {Date} [opts.now]
 */
export function planBackupPrune(backupDir, opts = {}) {
  const dryRun = opts.dryRun !== false;
  const now = opts.now || new Date();
  const files = listBackupFiles(backupDir);

  const daily = files.filter((f) => f.kind === 'daily');
  const predeploy = files.filter(
    (f) => f.kind === 'predeploy' || f.kind === 'legacy_predeploy'
  );
  const other = files.filter((f) => f.kind === 'other');

  const toDelete = [];
  const toKeep = [];

  for (const f of daily) {
    if (isProtectedBackupName(f.name)) {
      toKeep.push(f);
      continue;
    }
    if (isOlderThanDays(f.createdAt, DAILY_RETENTION_DAYS, now)) {
      toDelete.push(f);
    } else {
      toKeep.push(f);
    }
  }

  const sortedPredeploy = [...predeploy].sort((a, b) => b.mtimeMs - a.mtimeMs);
  sortedPredeploy.forEach((f, idx) => {
    if (isProtectedBackupName(f.name)) {
      toKeep.push(f);
      return;
    }
    const withinMin = idx < PREDEPLOY_MIN_KEEP;
    const tooOld = isOlderThanDays(f.createdAt, PREDEPLOY_MAX_AGE_DAYS, now);
    if (withinMin) {
      toKeep.push(f);
    } else if (tooOld) {
      toDelete.push(f);
    } else {
      toKeep.push(f);
    }
  });

  for (const f of other) {
    toKeep.push(f);
  }

  const deletePaths = new Set(toDelete.map((f) => f.path));
  const keepPaths = new Set(toKeep.map((f) => f.path));

  if (files.length > 0 && keepPaths.size === 0) {
    throw new Error('PRUNE_WOULD_DELETE_ALL_BACKUPS');
  }

  return {
    dryRun,
    toDelete: [...deletePaths],
    toKeep: [...keepPaths],
    counts: {
      daily: daily.length,
      predeploy: predeploy.length,
      delete: deletePaths.size,
      keep: keepPaths.size,
    },
  };
}

/**
 * @param {string} backupDir
 * @param {object} [opts]
 */
export function executeBackupPrune(backupDir, opts = {}) {
  const plan = planBackupPrune(backupDir, { ...opts, dryRun: opts.dryRun === true });
  if (plan.dryRun) {
    return { ...plan, deleted: [] };
  }

  const deleted = [];
  for (const dumpPath of plan.toDelete) {
    for (const artifact of relatedBackupArtifacts(dumpPath)) {
      if (fs.existsSync(artifact)) {
        fs.unlinkSync(artifact);
        deleted.push(artifact);
      }
    }
  }
  return { ...plan, deleted };
}
