'use strict';

/**
 * Integration: backup gate with real pg_dump/pg_restore on disposable DB.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execSync } = require('child_process');
const crypto = require('crypto');
const { acquireDbTestLock } = require('./helpers/db-test-lock.js');
const { isMockDatabaseUrl } = require('./helpers/migration-gate.js');

function hasPgTools() {
  try {
    execSync('which pg_dump pg_restore psql', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

async function createDisposableDb(baseUrl, name) {
  const admin = new URL(baseUrl);
  admin.pathname = '/postgres';
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: admin.toString(), ssl: false });
  const client = await pool.connect();
  try {
    await client.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [name]
    );
    await client.query(`DROP DATABASE IF EXISTS "${name}"`);
    await client.query(`CREATE DATABASE "${name}"`);
  } finally {
    client.release();
    await pool.end();
  }
  const target = new URL(baseUrl);
  target.pathname = `/${name}`;
  return target.toString();
}

describe('ops backup gate integration', () => {
  test('successful pg_dump backup gate on disposable database', async (t) => {
    const baseUrl = process.env.DATABASE_URL;
    if (isMockDatabaseUrl(baseUrl)) {
      t.skip('DATABASE_URL not set');
      return;
    }
    if (!baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
      t.skip('localhost only');
      return;
    }
    if (!hasPgTools()) {
      t.skip('pg_dump/pg_restore not installed');
      return;
    }

    const releaseLock = await acquireDbTestLock();
    const dbName = `integrity_restore_${Date.now()}`;
    const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-gate-'));
    try {
      const dbUrl = await createDisposableDb(baseUrl, dbName);
      execSync('npm run migrate', {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, DATABASE_URL: dbUrl, NODE_ENV: 'development' },
        stdio: 'pipe',
      });

      const familyId = crypto.randomUUID();
      const { Pool } = require('pg');
      const pool = new Pool({ connectionString: dbUrl, ssl: false });
      await pool.query(
        `INSERT INTO family (id, name, is_lifetime_free, subscription_status) VALUES ($1, 'Gate test', true, 'none')`,
        [familyId]
      );
      await pool.end();

      const { captureDbIntegritySnapshot } = await import('../scripts/ops/lib/db-integrity-snapshot-core.mjs');
      const snapshot = await captureDbIntegritySnapshot(dbUrl, { label: 'integration' });

      const { runPreDeployBackupGate } = await import('../scripts/ops/lib/backup-gate-core.mjs');
      const result = await runPreDeployBackupGate({
        databaseUrl: dbUrl,
        backupDir,
        deploySha: 'a'.repeat(40),
        snapshot,
        env: {
          ...process.env,
          BACKUP_REQUIRED: '1',
          APP_DB_BACKUP_DIR: backupDir,
          APP_DEPLOY_PRODUCTION: '0',
          NODE_ENV: 'test',
          BACKUP_MIN_FREE_BYTES: '1000000',
        },
      });

      assert.equal(result.skipped, false);
      assert.ok(fs.statSync(result.dumpPath).size > 0);
      assert.match(result.metadata.backup_file_sha256, /^[a-f0-9]{64}$/);

      const baselinePath = path.join(backupDir, 'baseline.json');
      fs.writeFileSync(baselinePath, JSON.stringify(snapshot));

      const rehDb = `${dbName}_reh`;
      execSync(
        `node scripts/ops/verify-backup-restore.mjs --backup "${result.dumpPath}" --target-db ${rehDb} --baseline-snapshot "${baselinePath}"`,
        {
          cwd: path.join(__dirname, '..'),
          env: {
            ...process.env,
            DATABASE_URL: baseUrl,
            DISPOSABLE_DB_PREFIX: 'integrity_restore_',
          },
          stdio: 'pipe',
        }
      );
    } finally {
      fs.rmSync(backupDir, { recursive: true, force: true });
      for (const name of [dbName, `${dbName}_reh`]) {
        try {
          await createDisposableDb(baseUrl, name);
        } catch {
          // drop attempt via recreate
        }
      }
      await releaseLock();
    }
  });
});
