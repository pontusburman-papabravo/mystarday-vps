'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execSync } = require('child_process');
const { isMockDatabaseUrl } = require('./helpers/migration-gate.js');

describe('verify-backup-restore lifecycle contract', () => {
  test('requires explicit --database-lifecycle', async () => {
    const { runVerifyBackupRestore } = await import('../scripts/ops/lib/verify-backup-restore-core.mjs');
    await assert.rejects(
      () =>
        runVerifyBackupRestore(
          {
            backupFile: __filename,
            targetDb: 'integrity_restore_a',
            baselineSnapshot: null,
            runMigrate: false,
            databaseLifecycle: null,
          },
          { DATABASE_URL: 'postgresql://u:p@localhost:5432/app' }
        ),
      /DATABASE_LIFECYCLE_REQUIRED/
    );
  });

  test('--target-precreated alias maps to external', async () => {
    const { parseVerifyBackupRestoreArgs } = await import(
      '../scripts/ops/lib/verify-backup-restore-core.mjs'
    );
    const args = parseVerifyBackupRestoreArgs([
      'node',
      'script',
      '--target-precreated',
      '--backup',
      'a',
      '--target-db',
      'integrity_restore_x',
    ]);
    assert.equal(args.databaseLifecycle, 'external');
  });

  test('external lifecycle forbids DATABASE_ADMIN_URL', async () => {
    const { runVerifyBackupRestore } = await import('../scripts/ops/lib/verify-backup-restore-core.mjs');
    await assert.rejects(
      () =>
        runVerifyBackupRestore(
          {
            backupFile: __filename,
            targetDb: 'integrity_restore_ext',
            baselineSnapshot: null,
            runMigrate: false,
            databaseLifecycle: 'external',
          },
          {
            DATABASE_URL: 'postgresql://u:p@localhost:5432/prod_db',
            DATABASE_ADMIN_URL: 'postgresql://admin:p@localhost:5432/postgres',
          }
        ),
      /DATABASE_ADMIN_URL_FORBIDDEN_IN_EXTERNAL_LIFECYCLE/
    );
  });

  test('managed lifecycle requires DATABASE_ADMIN_URL', async () => {
    const { runVerifyBackupRestore } = await import('../scripts/ops/lib/verify-backup-restore-core.mjs');
    await assert.rejects(
      () =>
        runVerifyBackupRestore(
          {
            backupFile: __filename,
            targetDb: 'integrity_restore_managed',
            baselineSnapshot: null,
            runMigrate: false,
            databaseLifecycle: 'managed',
          },
          { DATABASE_URL: 'postgresql://u:p@localhost:5432/prod_db' }
        ),
      /DATABASE_ADMIN_URL_REQUIRED_FOR_MANAGED_LIFECYCLE/
    );
  });

  test('external rejects target equal to source database name', async () => {
    const { verifyPrecreatedRestoreTarget } = await import(
      '../scripts/ops/lib/restore-target-verify.mjs'
    );
    await assert.rejects(
      () =>
        verifyPrecreatedRestoreTarget(
          'postgresql://u:p@localhost:5432/integrity_restore_live',
          'integrity_restore_live',
          { protectedName: 'integrity_restore_production' }
        ),
      /RESTORE_TARGET_IS_SOURCE_DATABASE/
    );
  });

  test('external rejects wrong prefix', async () => {
    const { validateDisposableDatabaseName } = await import(
      '../scripts/ops/lib/disposable-db-name.mjs'
    );
    const r = validateDisposableDatabaseName('stjarndag_tmp', {});
    assert.equal(r.ok, false);
  });

  test('managed create uses DATABASE_ADMIN_URL only', async () => {
    const { createDisposableDatabase } = await import('../scripts/ops/lib/disposable-db-admin.mjs');
    await assert.rejects(
      () => createDisposableDatabase('integrity_restore_no_admin', { lifecycle: 'managed' }),
      /DATABASE_ADMIN_URL_REQUIRED_FOR_MANAGED_LIFECYCLE/
    );
  });
});

describe('verify-backup-restore integration (disposable postgres)', () => {
  test('integration refuses without validated TEST_DATABASE_URL', () => {
    const { tryAssertDestructiveTestDatabaseAllowed, REFUSED_CODE } = require(
      '../scripts/lib/test-database-safety.cjs'
    );
    const result = tryAssertDestructiveTestDatabaseAllowed({
      NODE_ENV: 'test', // pragma: allowlist secret
      DATABASE_URL: 'postgresql://app:secret@localhost:5432/mystarday',
      TEST_DB_DESTRUCTIVE_CONFIRM: '1',
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, REFUSED_CODE);
    assert.equal(result.reason, 'missing_test_database_url');
  });

  test('external mode uses precreated empty DB without second CREATE', async (t) => {
    const baseUrl = process.env.TEST_DATABASE_URL;
    if (isMockDatabaseUrl(baseUrl) || !baseUrl) {
      t.skip('TEST_DATABASE_URL not set');
      return;
    }
    if (process.env.TEST_DB_DESTRUCTIVE_CONFIRM !== '1') {
      t.skip('TEST_DB_DESTRUCTIVE_CONFIRM=1 required');
      return;
    }
    try {
      execSync('which pg_restore pg_dump', { stdio: 'pipe' });
    } catch {
      t.skip('pg tools missing');
      return;
    }

    const adminUrl = new URL(baseUrl);
    adminUrl.pathname = '/postgres';
    const targetDb = `integrity_restore_lifecycle_${Date.now()}`;
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: adminUrl.toString(), ssl: false });
    const client = await pool.connect();
    try {
      await client.query(`CREATE DATABASE "${targetDb}" OWNER "${new URL(baseUrl).username}"`);
    } finally {
      client.release();
      await pool.end();
    }

    const { runVerifyBackupRestore } = await import('../scripts/ops/lib/verify-backup-restore-core.mjs');

    await assert.rejects(
      () =>
        runVerifyBackupRestore(
          {
            backupFile: path.join(__dirname, 'fixtures/no-such-backup.dump'),
            targetDb,
            baselineSnapshot: null,
            runMigrate: false,
            databaseLifecycle: 'external',
          },
          { DATABASE_URL: baseUrl }
        ),
      /BACKUP_FILE_NOT_FOUND|PG_RESTORE_FAILED/
    );

    const pool2 = new Pool({ connectionString: adminUrl.toString(), ssl: false });
    const c2 = await pool2.connect();
    try {
      await c2.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
        [targetDb]
      );
      await c2.query(`DROP DATABASE IF EXISTS "${targetDb}"`);
    } finally {
      c2.release();
      await pool2.end();
    }
  });

  test('managed lifecycle create+restore on disposable DB', async (t) => {
    const baseUrl = process.env.TEST_DATABASE_URL;
    if (isMockDatabaseUrl(baseUrl) || !baseUrl) {
      t.skip('TEST_DATABASE_URL not set');
      return;
    }
    if (process.env.TEST_DB_DESTRUCTIVE_CONFIRM !== '1') {
      t.skip('TEST_DB_DESTRUCTIVE_CONFIRM=1 required');
      return;
    }
    try {
      execSync('which pg_dump pg_restore', { stdio: 'pipe' });
    } catch {
      t.skip('pg tools missing');
      return;
    }

    const { acquireDbTestLock } = require('./helpers/db-test-lock.js');
    const releaseLock = await acquireDbTestLock(baseUrl);
    const adminUrl = new URL(baseUrl);
    adminUrl.pathname = '/postgres';
    const srcDb = `integrity_restore_src_${Date.now()}`;
    const rehDb = `integrity_restore_reh_${Date.now()}`;
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: adminUrl.toString(), ssl: false });
    const client = await pool.connect();
    try {
      await client.query(`CREATE DATABASE "${srcDb}"`);
      const srcUrl = new URL(baseUrl);
      srcUrl.pathname = `/${srcDb}`;
      execSync('npm run migrate', {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, DATABASE_URL: srcUrl.toString(), NODE_ENV: 'development' },
        stdio: 'pipe',
      });
      const { captureDbIntegritySnapshot } = await import(
        '../scripts/ops/lib/db-integrity-snapshot-core.mjs'
      );
      const snap = await captureDbIntegritySnapshot(srcUrl.toString(), { label: 't' });
      const fs = require('fs');
      const os = require('os');
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vbr-'));
      const dump = path.join(dir, 't.dump');
      const baseline = path.join(dir, 'b.json');
      fs.writeFileSync(baseline, JSON.stringify(snap));
      execSync(`pg_dump -Fc -f "${dump}" "${srcUrl.toString()}"`, { stdio: 'pipe' });

      execSync(
        `node scripts/ops/verify-backup-restore.mjs --database-lifecycle managed --backup "${dump}" --target-db ${rehDb} --baseline-snapshot "${baseline}"`,
        {
          cwd: path.join(__dirname, '..'),
          env: {
            ...process.env,
            DATABASE_URL: baseUrl,
            TEST_DATABASE_URL: baseUrl,
            TEST_DB_DESTRUCTIVE_CONFIRM: '1',
            DATABASE_ADMIN_URL: adminUrl.toString(),
            DISPOSABLE_DB_PREFIX: 'integrity_restore_',
          },
          stdio: 'pipe',
        }
      );

      await client.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = ANY($1::text[]) AND pid <> pg_backend_pid()`,
        [[srcDb, rehDb]]
      );
      await client.query(`DROP DATABASE IF EXISTS "${rehDb}"`);
      await client.query(`DROP DATABASE IF EXISTS "${srcDb}"`);
      fs.rmSync(dir, { recursive: true, force: true });
    } finally {
      client.release();
      await pool.end();
      releaseLock();
    }
  });
});

describe('run-vps-restore-rehearsal checkout contract', () => {
  test('uses git clone --no-checkout and records TARGET_SHA', async () => {
    const fs = require('fs');
    const script = fs.readFileSync(
      path.join(__dirname, '../scripts/ops/run-vps-restore-rehearsal.sh'),
      'utf8'
    );
    assert.match(script, /git clone --no-checkout/);
    assert.match(script, /\.rehearsal-target-sha/);
    assert.match(script, /--database-lifecycle external/);
    assert.match(script, /unset DATABASE_ADMIN_URL/);
    assert.match(script, /app-disposable-db create "\$RESTORE_DB"/);
  });
});
