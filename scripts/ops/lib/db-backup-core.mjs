import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { BACKUP_ARCHIVE_REQUIRED_TABLES } from './snapshot-tables.mjs';
import { sanitizeIdentityForLog } from './database-identity.mjs';
import {
  assertBackupToolchain,
  assertBackupDirectorySafe,
  assertWritableDirectory,
} from './backup-prerequisites.mjs';

/** @typedef {'daily' | 'predeploy'} BackupType */

export const BACKUP_LOCK_FILENAME = '.app-backup.lock';
export const PARTIAL_SUFFIX = '.partial';
export const DUMP_SUFFIX = '.dump';
export const CHECKSUM_SUFFIX = '.sha256';
export const META_SUFFIX = '.meta.json';

export const DAILY_RETENTION_DAYS = 30;
export const PREDEPLOY_MIN_KEEP = 7;
export const PREDEPLOY_MAX_AGE_DAYS = 30;

const DAILY_NAME_RE =
  /^app-daily-(\d{4}-\d{2}-\d{2}T\d{6})\.dump$/;
const PREDEPLOY_NAME_RE =
  /^app-predeploy-(\d{4}-\d{2}-\d{2}T\d{6})-[a-f0-9]+\.dump$/;
const LEGACY_PREDEPLOY_NAME_RE = /^predeploy_(.+)\.dump$/;

/**
 * Compact UTC timestamp for filenames: 2026-08-16T031500
 * @param {Date} [date]
 */
export function formatBackupTimestamp(date = new Date()) {
  const iso = date.toISOString();
  const [day, timeMs] = iso.split('T');
  const compactTime = timeMs.replace(/\.\d+Z$/, '').replace(/:/g, '');
  return `${day}T${compactTime}`;
}

/**
 * @param {BackupType} type
 * @param {{ deploySha?: string, timestamp?: string }} [opts]
 */
export function buildBackupBaseName(type, opts = {}) {
  const ts = opts.timestamp || formatBackupTimestamp();
  if (type === 'daily') {
    return `app-daily-${ts}`;
  }
  const sha = (opts.deploySha || 'unknown').slice(0, 12);
  return `app-predeploy-${ts}-${sha}`;
}

/**
 * @param {string} filename
 * @returns {{ kind: 'daily' | 'predeploy' | 'legacy_predeploy' | 'other', createdAt?: Date }}
 */
export function classifyBackupFilename(filename) {
  const base = path.basename(filename);
  let match = base.match(DAILY_NAME_RE);
  if (match) {
    return { kind: 'daily', createdAt: parseBackupTimestamp(match[1]) };
  }
  match = base.match(PREDEPLOY_NAME_RE);
  if (match) {
    return { kind: 'predeploy', createdAt: parseBackupTimestamp(match[1]) };
  }
  match = base.match(LEGACY_PREDEPLOY_NAME_RE);
  if (match) {
    return { kind: 'legacy_predeploy', createdAt: parseLegacyPredeployTimestamp(match[1]) };
  }
  return { kind: 'other' };
}

/**
 * @param {string} compactTs e.g. 2026-08-16T031500
 */
export function parseBackupTimestamp(compactTs) {
  const m = compactTs.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (!m) return null;
  const iso = `${m[1]}T${m[2]}:${m[3]}:${m[4]}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseLegacyPredeployTimestamp(raw) {
  const normalized = raw.replace(/-/g, ':').replace(/T(\d{2}):(\d{2}):(\d{2})/, 'T$1:$2:$3');
  const d = new Date(normalized.endsWith('Z') ? normalized : `${normalized}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function ensureDirSecure(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 });
  const stat = fs.statSync(dirPath);
  if ((stat.mode & 0o077) !== 0) {
    throw new Error('BACKUP_DIR_INSECURE_PERMISSIONS');
  }
}

export function checkDiskSpace(dirPath, requiredBytes) {
  try {
    const out = execFileSync('df', ['-B1', dirPath], { encoding: 'utf8' });
    const line = out.trim().split('\n').pop();
    const parts = line.split(/\s+/);
    const available = Number(parts[3]);
    if (!Number.isFinite(available) || available < requiredBytes) {
      throw new Error('INSUFFICIENT_DISK_SPACE');
    }
  } catch (err) {
    if (err.message === 'INSUFFICIENT_DISK_SPACE') throw err;
    throw new Error('DISK_CHECK_FAILED');
  }
}

export function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

export function writeChecksumSidecar(dumpPath, checksum) {
  const sidecar = `${dumpPath}${CHECKSUM_SUFFIX}`;
  const line = `${checksum}  ${path.basename(dumpPath)}\n`;
  fs.writeFileSync(sidecar, line, { mode: 0o600 });
  return sidecar;
}

export function verifyChecksumSidecar(dumpPath) {
  const sidecar = `${dumpPath}${CHECKSUM_SUFFIX}`;
  if (!fs.existsSync(sidecar)) {
    throw new Error('CHECKSUM_SIDECAR_MISSING');
  }
  const expected = sha256File(dumpPath);
  const content = fs.readFileSync(sidecar, 'utf8').trim();
  const listed = content.split(/\s+/)[0];
  if (listed !== expected) {
    throw new Error('CHECKSUM_MISMATCH');
  }
  return expected;
}

export function verifyPgRestoreList(dumpPath, requiredTables = BACKUP_ARCHIVE_REQUIRED_TABLES) {
  const list = execFileSync('pg_restore', ['--list', dumpPath], { encoding: 'utf8' });
  for (const table of requiredTables) {
    const pattern = new RegExp(`TABLE DATA public ${table}\\b`);
    if (!pattern.test(list)) {
      throw new Error(`BACKUP_MISSING_TABLE:${table}`);
    }
  }
  return list.split('\n').filter(Boolean).length;
}

/**
 * Exclusive backup lock via O_EXCL lock file (flock-equivalent for single-host jobs).
 * @param {string} backupDir
 * @param {() => T | Promise<T>} fn
 * @returns {Promise<T>}
 * @template T
 */
export async function withBackupLock(backupDir, fn) {
  ensureDirSecure(backupDir);
  const lockPath = path.join(backupDir, BACKUP_LOCK_FILENAME);
  let lockFd;
  try {
    lockFd = fs.openSync(lockPath, 'wx');
    fs.writeSync(lockFd, `${process.pid}\n`);
  } catch (err) {
    if (err && err.code === 'EEXIST') throw new Error('BACKUP_LOCK_HELD');
    throw err;
  }

  try {
    return await fn();
  } finally {
    try {
      fs.closeSync(lockFd);
    } catch {
      // ignore
    }
    try {
      if (fs.existsSync(lockPath)) {
        const owner = fs.readFileSync(lockPath, 'utf8').trim();
        if (owner === String(process.pid)) fs.unlinkSync(lockPath);
      }
    } catch {
      // ignore
    }
  }
}

function cleanupPartial(partialPath) {
  try {
    if (fs.existsSync(partialPath)) fs.unlinkSync(partialPath);
  } catch {
    // best effort
  }
}

function chmodBackupFile(filePath) {
  try {
    fs.chmodSync(filePath, 0o600);
  } catch {
    // best effort on some filesystems
  }
}

function fetchPostgresVersion(databaseUrl) {
  try {
    return execFileSync('psql', [databaseUrl, '-tAc', 'SHOW server_version'], {
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * @param {object} opts
 * @param {BackupType} opts.type
 * @param {string} opts.databaseUrl
 * @param {string} opts.backupDir
 * @param {string} [opts.deploySha]
 * @param {string} [opts.repoRoot]
 * @param {object} [opts.snapshot] pre-captured integrity snapshot
 * @param {string[]} [opts.pendingMigrations]
 * @param {number} [opts.appliedMigrationsCount]
 * @param {NodeJS.ProcessEnv} [opts.env]
 */
export async function createDatabaseBackup(opts) {
  const env = { ...process.env, ...opts.env };
  const { databaseUrl, backupDir, type } = opts;
  if (!databaseUrl) throw new Error('DATABASE_URL_MISSING');
  if (!backupDir) throw new Error('APP_DB_BACKUP_DIR_MISSING');

  const repoRoot = opts.repoRoot || process.cwd();
  assertBackupToolchain();
  assertBackupDirectorySafe(backupDir, repoRoot);
  assertWritableDirectory(backupDir);
  ensureDirSecure(backupDir);

  const minFree = Number(env.BACKUP_MIN_FREE_BYTES || 2_000_000_000);
  checkDiskSpace(backupDir, minFree);

  const deploySha = opts.deploySha || env.DEPLOY_SHA || 'unknown';
  const baseName = buildBackupBaseName(type, { deploySha });
  const partialPath = path.join(backupDir, `${baseName}${DUMP_SUFFIX}${PARTIAL_SUFFIX}`);
  const dumpPath = path.join(backupDir, `${baseName}${DUMP_SUFFIX}`);
  const metaPath = path.join(backupDir, `${baseName}${META_SUFFIX}`);

  cleanupPartial(partialPath);

  const pgDump = spawnSync(
    'pg_dump',
    ['-Fc', '-f', partialPath, '--no-owner', '--no-acl', databaseUrl],
    { encoding: 'utf8' }
  );
  if (pgDump.status !== 0) {
    cleanupPartial(partialPath);
    throw new Error(`PG_DUMP_FAILED:${pgDump.stderr || pgDump.stdout}`);
  }
  if (!fs.existsSync(partialPath)) {
    throw new Error('BACKUP_FILE_MISSING');
  }
  const partialStat = fs.statSync(partialPath);
  if (partialStat.size === 0) {
    cleanupPartial(partialPath);
    throw new Error('BACKUP_FILE_EMPTY');
  }

  const archiveEntries = verifyPgRestoreList(partialPath);
  const checksum = sha256File(partialPath);

  fs.renameSync(partialPath, dumpPath);
  const finalChecksumPath = writeChecksumSidecar(dumpPath, checksum);
  verifyChecksumSidecar(dumpPath);

  chmodBackupFile(dumpPath);
  chmodBackupFile(finalChecksumPath);

  const stat = fs.statSync(dumpPath);
  const snapshot = opts.snapshot || null;
  const metadata = {
    version: 2,
    type,
    status: 'CREATED',
    created_at_utc: new Date().toISOString(),
    deploy_candidate_sha: type === 'predeploy' ? deploySha : null,
    git_sha_at_backup: deploySha,
    database_identity: sanitizeIdentityForLog(databaseUrl),
    postgres_server_version: fetchPostgresVersion(databaseUrl),
    database_size_bytes: snapshot?.database_size_bytes ?? null,
    backup_file_bytes: stat.size,
    backup_file_sha256: checksum,
    backup_file: path.basename(dumpPath),
    pg_restore_list_entries: archiveEntries,
    applied_migrations_count: opts.appliedMigrationsCount ?? null,
    pending_migrations: opts.pendingMigrations ?? [],
    pre_backup_snapshot_label: snapshot?.label ?? null,
    family_row_count: snapshot?.tables?.family?.row_count ?? null,
    table_counts: buildTableCounts(snapshot),
    latest_migration: snapshot?.latest_migration ?? null,
  };

  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), { mode: 0o600 });
  chmodBackupFile(metaPath);

  return {
    type,
    baseName,
    dumpPath,
    metaPath,
    checksumPath: finalChecksumPath,
    metadata,
    checksum,
    snapshot,
  };
}

/**
 * @param {object | null} snapshot
 */
export function buildTableCounts(snapshot) {
  if (!snapshot?.tables) return {};
  const keys = ['family', 'parent', 'child', 'weekly_schedule', 'daily_log', 'reward'];
  const out = {};
  for (const key of keys) {
    const row = snapshot.tables[key];
    if (row?.exists) out[key] = row.row_count;
  }
  return out;
}

/**
 * Remove stale .partial files older than maxAgeHours (default 48h).
 * @param {string} backupDir
 * @param {number} [maxAgeHours]
 */
export function cleanupStalePartialFiles(backupDir, maxAgeHours = 48) {
  if (!fs.existsSync(backupDir)) return 0;
  const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;
  let removed = 0;
  for (const name of fs.readdirSync(backupDir)) {
    if (!name.endsWith(`${DUMP_SUFFIX}${PARTIAL_SUFFIX}`)) continue;
    const full = path.join(backupDir, name);
    const stat = fs.statSync(full);
    if (stat.mtimeMs < cutoff) {
      fs.unlinkSync(full);
      removed += 1;
    }
  }
  return removed;
}

export {
  DAILY_NAME_RE,
  PREDEPLOY_NAME_RE,
  LEGACY_PREDEPLOY_NAME_RE,
};
