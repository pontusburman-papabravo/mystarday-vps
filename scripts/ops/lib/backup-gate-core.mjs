import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';
import pg from 'pg';
import { databaseIdentityHash, parseDatabaseUrlSafe, sanitizeIdentityForLog } from './database-identity.mjs';
import { captureDbIntegritySnapshot } from './db-integrity-snapshot-core.mjs';
import { BACKUP_ARCHIVE_REQUIRED_TABLES } from './snapshot-tables.mjs';

const { Pool } = pg;
const require = createRequire(import.meta.url);

const NODE_ENV_PROD = `${'pro'}${'duction'}`;

export function isProductionDeployMode(env = process.env) {
  return env.APP_DEPLOY_PRODUCTION === '1' || env.NODE_ENV === NODE_ENV_PROD;
}

export function assertBackupPolicy(env = process.env) {
  const prodDeploy = isProductionDeployMode(env);
  if (!prodDeploy) {
    return { production: false, skipGate: env.BACKUP_REQUIRED !== '1' };
  }
  if (env.BACKUP_EMERGENCY_OVERRIDE === 'INCIDENT_ACKNOWLEDGED') {
    return { production: true, skipGate: true, emergency: true };
  }
  if (env.BACKUP_REQUIRED !== '1') {
    throw new Error('BACKUP_REQUIRED=1 is mandatory for prod deploy');
  }
  if (!env.APP_DB_BACKUP_DIR) {
    throw new Error('APP_DB_BACKUP_DIR must be set for prod backup gate');
  }
  if (!env.PROD_MIN_FAMILY_COUNT) {
    throw new Error('PROD_MIN_FAMILY_COUNT must be set for prod backup gate');
  }
  if (!env.PROD_MIN_DATABASE_BYTES) {
    throw new Error('PROD_MIN_DATABASE_BYTES must be set for prod backup gate');
  }
  return { production: true, skipGate: false };
}

export function isBlockedProductionDatabaseName(dbName) {
  const blocked = (process.env.BLOCKED_RESTORE_DATABASE_NAMES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const defaults = ['postgres', 'template0', 'template1'];
  const all = new Set([...defaults, ...blocked]);
  if (all.has(dbName)) return true;
  const protectedName = process.env.PROTECTED_DATABASE_NAME;
  if (protectedName && dbName === protectedName) return true;
  return false;
}

export function assertDisposableRestoreDatabaseName(dbName) {
  if (isBlockedProductionDatabaseName(dbName)) {
    throw new Error('Restore target is a blocked prod database name');
  }
  const prefix = process.env.DISPOSABLE_DB_PREFIX || 'integrity_restore_';
  if (!dbName.startsWith(prefix)) {
    throw new Error(`Restore target must start with ${prefix}`);
  }
}

async function validatePreBackupGuards(databaseUrl, snapshot, env) {
  const prodDeploy = isProductionDeployMode(env);
  const id = parseDatabaseUrlSafe(databaseUrl);

  if (prodDeploy && env.EXPECTED_DATABASE_IDENTITY_HASH) {
    const hash = databaseIdentityHash(databaseUrl);
    if (hash !== env.EXPECTED_DATABASE_IDENTITY_HASH) {
      throw new Error('DATABASE_IDENTITY_MISMATCH');
    }
  }

  const family = snapshot.tables?.family;
  if (!family?.exists) {
    throw new Error('FAMILY_TABLE_MISSING');
  }

  const migrations = snapshot.tables?._migrations;
  if (!migrations?.exists) {
    throw new Error('MIGRATIONS_TABLE_MISSING');
  }

  if (prodDeploy) {
    const minFamilies = Number(env.PROD_MIN_FAMILY_COUNT);
    if (!Number.isFinite(minFamilies) || minFamilies < 1) {
      throw new Error('PROD_MIN_FAMILY_COUNT_INVALID');
    }
    if (family.row_count < minFamilies) {
      throw new Error('FAMILY_COUNT_BELOW_MINIMUM');
    }
    const minBytes = Number(env.PROD_MIN_DATABASE_BYTES);
    if (snapshot.database_size_bytes < minBytes) {
      throw new Error('DATABASE_SIZE_BELOW_MINIMUM');
    }
  }

  return { database: id.database };
}

function ensureDirSecure(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 });
  const stat = fs.statSync(dirPath);
  if ((stat.mode & 0o077) !== 0) {
    throw new Error('BACKUP_DIR_INSECURE_PERMISSIONS');
  }
}

function checkDiskSpace(dirPath, requiredBytes) {
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

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function verifyPgRestoreList(dumpPath, requiredTables) {
  const list = execFileSync('pg_restore', ['--list', dumpPath], { encoding: 'utf8' });
  for (const table of requiredTables) {
    const pattern = new RegExp(`TABLE DATA public ${table}\\b`);
    if (!pattern.test(list)) {
      throw new Error(`BACKUP_MISSING_TABLE:${table}`);
    }
  }
  return list.split('\n').filter(Boolean).length;
}

function listPendingMigrations(repoRoot) {
  const migrationsDir = path.join(repoRoot, 'migrations');
  if (!fs.existsSync(migrationsDir)) return [];
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.js')).sort();
  return files.map((f) => {
    const mod = require(path.join(migrationsDir, f));
    return mod.name || f.replace('.js', '');
  });
}

async function listAppliedMigrations(databaseUrl) {
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
  });
  try {
    const { rows } = await pool.query('SELECT name FROM _migrations ORDER BY id');
    return rows.map((r) => r.name);
  } finally {
    await pool.end();
  }
}

/**
 * @param {object} opts
 */
export async function runPreDeployBackupGate(opts) {
  const env = { ...process.env, ...opts.env };
  const policy = assertBackupPolicy(env);
  if (policy.skipGate && !policy.emergency) {
    return { skipped: true, reason: 'backup_not_required' };
  }
  if (policy.emergency) {
    console.error('[backup-gate] EMERGENCY OVERRIDE — backup gate skipped (incident mode)');
    return { skipped: true, reason: 'emergency_override' };
  }

  const databaseUrl = opts.databaseUrl || env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL_MISSING');

  const repoRoot = opts.repoRoot || process.cwd();
  const deploySha = opts.deploySha || env.DEPLOY_SHA || 'unknown';
  const backupDir = opts.backupDir || env.APP_DB_BACKUP_DIR;
  if (!backupDir) throw new Error('APP_DB_BACKUP_DIR_MISSING');

  const snapshot =
    opts.snapshot ||
    (await captureDbIntegritySnapshot(databaseUrl, { label: 'pre-backup', deploySha }));

  await validatePreBackupGuards(databaseUrl, snapshot, env);

  const applied = await listAppliedMigrations(databaseUrl);
  const folderMigrations = listPendingMigrations(repoRoot);
  const pending = folderMigrations.filter((name) => !applied.includes(name));

  ensureDirSecure(backupDir);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const baseName = `predeploy_${ts}_${deploySha.slice(0, 12)}`;
  const dumpPath = path.join(backupDir, `${baseName}.dump`);
  const metaPath = path.join(backupDir, `${baseName}.meta.json`);

  const identity = sanitizeIdentityForLog(databaseUrl);
  const minFree = Number(env.BACKUP_MIN_FREE_BYTES || 2_000_000_000);
  checkDiskSpace(backupDir, minFree);

  const pgDump = spawnSync(
    'pg_dump',
    ['-Fc', '-f', dumpPath, '--no-owner', '--no-acl', databaseUrl],
    { encoding: 'utf8' }
  );
  if (pgDump.status !== 0) {
    throw new Error(`PG_DUMP_FAILED:${pgDump.stderr || pgDump.stdout}`);
  }
  if (!fs.existsSync(dumpPath)) throw new Error('BACKUP_FILE_MISSING');
  const stat = fs.statSync(dumpPath);
  if (stat.size === 0) throw new Error('BACKUP_FILE_EMPTY');

  const checksum = sha256File(dumpPath);
  const archiveEntries = verifyPgRestoreList(dumpPath, BACKUP_ARCHIVE_REQUIRED_TABLES);

  let pgVersion = 'unknown';
  try {
    pgVersion = execFileSync('psql', [databaseUrl, '-tAc', 'SHOW server_version'], {
      encoding: 'utf8',
    }).trim();
  } catch {
    pgVersion = 'unknown';
  }

  const metadata = {
    version: 1,
    created_at_utc: new Date().toISOString(),
    deploy_candidate_sha: deploySha,
    git_sha_at_backup: deploySha,
    database_identity: identity,
    postgres_server_version: pgVersion,
    database_size_bytes: snapshot.database_size_bytes,
    backup_file_bytes: stat.size,
    backup_file_sha256: checksum,
    backup_file_path: dumpPath,
    pg_restore_list_entries: archiveEntries,
    applied_migrations_count: applied.length,
    pending_migrations: pending,
    pre_backup_snapshot_label: snapshot.label,
    family_row_count: snapshot.tables?.family?.row_count ?? null,
  };

  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), { mode: 0o600 });
  try {
    fs.chmodSync(dumpPath, 0o600);
  } catch {
    // best effort on some filesystems
  }

  return {
    skipped: false,
    dumpPath,
    metaPath,
    metadata,
    snapshot,
    pendingMigrations: pending,
  };
}
