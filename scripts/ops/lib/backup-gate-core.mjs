import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import pg from 'pg';
import { databaseIdentityHash, parseDatabaseUrlSafe, sanitizeIdentityForLog } from './database-identity.mjs';
import { captureDbIntegritySnapshot } from './db-integrity-snapshot-core.mjs';
import { readEmergencyOverrideMarker, logEmergencyOverride } from './emergency-override.mjs';
import {
  assertBackupToolchain,
  assertBackupDirectorySafe,
  assertWritableDirectory,
} from './backup-prerequisites.mjs';
import { createDatabaseBackup, withBackupLock } from './db-backup-core.mjs';

const { Pool } = pg;
const require = createRequire(import.meta.url);

const NODE_ENV_PROD = `${'pro'}${'duction'}`;

export function isProductionDeployMode(env = process.env) {
  return env.APP_DEPLOY_PRODUCTION === '1' || env.NODE_ENV === NODE_ENV_PROD;
}

export function assertBackupPolicy(env = process.env) {
  if (env.BACKUP_EMERGENCY_OVERRIDE) {
    throw new Error('BACKUP_EMERGENCY_ENV_FORBIDDEN_USE_MARKER_FILE');
  }
  const prodDeploy = isProductionDeployMode(env);
  if (!prodDeploy) {
    return { prodDeploy: false, skipGate: env.BACKUP_REQUIRED !== '1' };
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
  return { prodDeploy: true, skipGate: false };
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
  const databaseUrl = opts.databaseUrl || env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL_MISSING');

  const repoRoot = opts.repoRoot || process.cwd();
  const deploySha = opts.deploySha || env.DEPLOY_SHA || 'unknown';

  const snapshot =
    opts.snapshot ||
    (await captureDbIntegritySnapshot(databaseUrl, { label: 'pre-backup', deploySha }));

  await validatePreBackupGuards(databaseUrl, snapshot, env);

  const markerPath =
    opts.emergencyMarkerPath || env.BACKUP_EMERGENCY_MARKER_FILE || env.DEPLOY_EMERGENCY_MARKER;
  const emergencyOverride = readEmergencyOverrideMarker(markerPath, env);
  if (emergencyOverride.active) {
    logEmergencyOverride(emergencyOverride.record);
    return {
      skipped: true,
      reason: 'emergency_override',
      emergency: emergencyOverride.record,
      snapshot,
    };
  }

  if (policy.skipGate) {
    return { skipped: true, reason: 'backup_not_required', snapshot };
  }

  const backupDir = opts.backupDir || env.APP_DB_BACKUP_DIR;
  if (!backupDir) throw new Error('APP_DB_BACKUP_DIR_MISSING');

  assertBackupToolchain();
  assertBackupDirectorySafe(backupDir, repoRoot);
  assertWritableDirectory(backupDir);

  const applied = await listAppliedMigrations(databaseUrl);
  const folderMigrations = listPendingMigrations(repoRoot);
  const pending = folderMigrations.filter((name) => !applied.includes(name));

  return withBackupLock(backupDir, async () => {
    const result = await createDatabaseBackup({
      type: 'predeploy',
      databaseUrl,
      backupDir,
      deploySha,
      repoRoot,
      snapshot,
      pendingMigrations: pending,
      appliedMigrationsCount: applied.length,
      env,
    });

    return {
      skipped: false,
      dumpPath: result.dumpPath,
      metaPath: result.metaPath,
      metadata: result.metadata,
      snapshot,
      pendingMigrations: pending,
    };
  });
}

export { sanitizeIdentityForLog };
