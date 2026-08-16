'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

describe('db-backup-core naming', () => {
  test('buildBackupBaseName daily and predeploy', async () => {
    const {
      buildBackupBaseName,
      formatBackupTimestamp,
      classifyBackupFilename,
      parseBackupTimestamp,
    } = await import('../scripts/ops/lib/db-backup-core.mjs');

    const ts = '2026-08-16T031500';
    assert.equal(buildBackupBaseName('daily', { timestamp: ts }), `app-daily-${ts}`);
    assert.equal(
      buildBackupBaseName('predeploy', { timestamp: ts, deploySha: 'a'.repeat(40) }),
      `app-predeploy-${ts}-${'a'.repeat(12)}`
    );

    const parsed = parseBackupTimestamp(ts);
    assert.ok(parsed instanceof Date);

    assert.equal(classifyBackupFilename('app-daily-2026-08-16T031500.dump').kind, 'daily');
    assert.equal(
      classifyBackupFilename('app-predeploy-2026-08-16T031500-abc123def456.dump').kind,
      'predeploy'
    );
    assert.equal(
      classifyBackupFilename('predeploy_2026-08-03T12-58-47-983Z_048b98df985f.dump').kind,
      'legacy_predeploy'
    );

    const now = formatBackupTimestamp(new Date('2026-08-16T01:15:00.000Z'));
    assert.match(now, /^\d{4}-\d{2}-\d{2}T\d{6}$/);
  });
});

describe('backup prune policy', () => {
  test('planBackupPrune with synthetic file list via temp dir', async () => {
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');
    const { planBackupPrune } = await import('../scripts/ops/lib/backup-prune-core.mjs');

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-prune-'));
    const now = new Date('2026-08-16T12:00:00.000Z');

    const oldDaily = path.join(dir, 'app-daily-2026-07-01T031500.dump');
    const newDaily = path.join(dir, 'app-daily-2026-08-15T031500.dump');
    const incident = path.join(dir, 'incident_damaged_2026-08-14.dump');

    for (const f of [oldDaily, newDaily, incident]) {
      fs.writeFileSync(f, 'x');
      const d = f.includes('2026-07') ? new Date('2026-07-01T03:15:00Z') : new Date('2026-08-15T03:15:00Z');
      fs.utimesSync(f, d, d);
    }

    for (let i = 0; i < 8; i += 1) {
      const d = new Date(`2026-08-${String(10 - i).padStart(2, '0')}T10:00:00Z`);
      const f = path.join(
        dir,
        `app-predeploy-2026-08-${String(10 - i).padStart(2, '0')}T100000-sha${i}.dump`
      );
      fs.writeFileSync(f, 'x');
      fs.utimesSync(f, d, d);
    }

    const plan = planBackupPrune(dir, { dryRun: true, now });
    assert.ok(plan.toDelete.includes(oldDaily));
    assert.ok(plan.toKeep.includes(newDaily));
    assert.ok(plan.toKeep.includes(incident));
    assert.ok(plan.toKeep.length >= 7);

    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('backup lock', () => {
  test('withBackupLock rejects parallel acquisition', async () => {
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');
    const { withBackupLock } = await import('../scripts/ops/lib/db-backup-core.mjs');

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-lock-'));
    const lockPath = path.join(dir, '.app-backup.lock');
    fs.writeFileSync(lockPath, '99999\n');

    await assert.rejects(() => withBackupLock(dir, async () => 'ok'), /BACKUP_LOCK_HELD/);

    fs.rmSync(dir, { recursive: true, force: true });
  });
});
