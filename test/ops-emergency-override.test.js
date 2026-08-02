'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

describe('emergency backup override', () => {
  test('env-only BACKUP_EMERGENCY_OVERRIDE is rejected', async () => {
    const { assertBackupPolicy } = await import('../scripts/ops/lib/backup-gate-core.mjs');
    assert.throws(
      () =>
        assertBackupPolicy({
          APP_DEPLOY_PRODUCTION: '1',
          BACKUP_REQUIRED: '1',
          BACKUP_EMERGENCY_OVERRIDE: 'INCIDENT_ACKNOWLEDGED',
        }),
      /BACKUP_EMERGENCY_ENV_FORBIDDEN/
    );
  });

  test('valid marker file enables skip after identity guards', async () => {
    const marker = path.join(os.tmpdir(), `emergency-marker-${process.pid}.json`);
    const deploySha = 'b'.repeat(40);
    const now = new Date().toISOString();
    fs.writeFileSync(
      marker,
      JSON.stringify({
        acknowledged: 'INCIDENT_ACKNOWLEDGED',
        deploy_sha: deploySha,
        operator: 'qa-agent',
        created_at_utc: now,
      })
    );
    try {
      const { runPreDeployBackupGate } = await import('../scripts/ops/lib/backup-gate-core.mjs');
      const snapshot = {
        database_size_bytes: 50_000_000,
        tables: {
          family: { exists: true, row_count: 300 },
          _migrations: { exists: true, row_count: 1 },
        },
      };
      const result = await runPreDeployBackupGate({
        databaseUrl: 'postgresql://u:p@localhost:5432/fake',
        snapshot,
        deploySha,
        emergencyMarkerPath: marker,
        env: {
          APP_DEPLOY_PRODUCTION: '1',
          BACKUP_REQUIRED: '1',
          APP_DB_BACKUP_DIR: '/var/backups/app-db',
          PROD_MIN_FAMILY_COUNT: '1',
          PROD_MIN_DATABASE_BYTES: '1',
          DEPLOY_SHA: deploySha,
          EXPECTED_DATABASE_IDENTITY_HASH: '',
        },
      });
      assert.equal(result.skipped, true);
      assert.equal(result.reason, 'emergency_override');
      assert.equal(result.emergency.operator, 'qa-agent');
    } finally {
      fs.unlinkSync(marker);
    }
  });

  test('identity mismatch still blocks emergency marker path', async () => {
    const marker = path.join(os.tmpdir(), `emergency-marker-${process.pid}-2.json`);
    const deploySha = 'c'.repeat(40);
    fs.writeFileSync(
      marker,
      JSON.stringify({
        acknowledged: 'INCIDENT_ACKNOWLEDGED',
        deploy_sha: deploySha,
        operator: 'qa-agent',
        created_at_utc: new Date().toISOString(),
      })
    );
    try {
      const { runPreDeployBackupGate } = await import('../scripts/ops/lib/backup-gate-core.mjs');
      const snapshot = {
        database_size_bytes: 50_000_000,
        tables: {
          family: { exists: true, row_count: 300 },
          _migrations: { exists: true, row_count: 1 },
        },
      };
      await assert.rejects(
        () =>
          runPreDeployBackupGate({
            databaseUrl: process.env.DATABASE_URL || 'postgresql://u:p@localhost:5432/fake',
            snapshot,
            deploySha,
            emergencyMarkerPath: marker,
            env: {
              APP_DEPLOY_PRODUCTION: '1',
              BACKUP_REQUIRED: '1',
              APP_DB_BACKUP_DIR: '/var/backups/app-db',
              PROD_MIN_FAMILY_COUNT: '1',
              PROD_MIN_DATABASE_BYTES: '1',
              DEPLOY_SHA: deploySha,
              EXPECTED_DATABASE_IDENTITY_HASH: 'deadbeef',
            },
          }),
        /DATABASE_IDENTITY_MISMATCH/
      );
    } finally {
      fs.unlinkSync(marker);
    }
  });
});
