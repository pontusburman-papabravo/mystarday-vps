'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

describe('backup gate policy', () => {
  test('production requires BACKUP_REQUIRED=1', async () => {
    const { assertBackupPolicy } = await import('../scripts/ops/lib/backup-gate-core.mjs');
    assert.throws(
      () => assertBackupPolicy({
        APP_DEPLOY_PRODUCTION: '1',
        NODE_ENV: 'production',
        BACKUP_REQUIRED: '0',
        APP_DB_BACKUP_DIR: '/tmp/b',
        PROD_MIN_FAMILY_COUNT: '1',
        PROD_MIN_DATABASE_BYTES: '1',
      }),
      /BACKUP_REQUIRED/
    );
  });

  test('production missing APP_DB_BACKUP_DIR fails closed', async () => {
    const { assertBackupPolicy } = await import('../scripts/ops/lib/backup-gate-core.mjs');
    assert.throws(
      () => assertBackupPolicy({
        APP_DEPLOY_PRODUCTION: '1',
        BACKUP_REQUIRED: '1',
        PROD_MIN_FAMILY_COUNT: '1',
        PROD_MIN_DATABASE_BYTES: '1',
      }),
      /APP_DB_BACKUP_DIR/
    );
  });

  test('non-production skips gate when BACKUP_REQUIRED not set', async () => {
    const { assertBackupPolicy } = await import('../scripts/ops/lib/backup-gate-core.mjs');
    const p = assertBackupPolicy({ NODE_ENV: 'development' });
    assert.equal(p.skipGate, true);
  });

  test('emergency override skips with flag', async () => {
    const { assertBackupPolicy } = await import('../scripts/ops/lib/backup-gate-core.mjs');
    const p = assertBackupPolicy({
      APP_DEPLOY_PRODUCTION: '1',
      BACKUP_REQUIRED: '1',
      BACKUP_EMERGENCY_OVERRIDE: 'INCIDENT_ACKNOWLEDGED',
    });
    assert.equal(p.skipGate, true);
    assert.equal(p.emergency, true);
  });

  test('restore target refuses protected database name', async () => {
    const {
      assertDisposableRestoreDatabaseName,
      isBlockedProductionDatabaseName,
    } = await import('../scripts/ops/lib/backup-gate-core.mjs');
    process.env.PROTECTED_DATABASE_NAME = 'prod_main';
    try {
      assert.throws(() => assertDisposableRestoreDatabaseName('prod_main'), /blocked/);
      assert.throws(() => assertDisposableRestoreDatabaseName('other'), /integrity_restore_/);
      assert.equal(isBlockedProductionDatabaseName('postgres'), true);
    } finally {
      delete process.env.PROTECTED_DATABASE_NAME;
    }
  });
});
