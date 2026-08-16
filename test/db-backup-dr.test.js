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
      parseLegacyPredeployTimestamp,
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

    const legacyName = 'predeploy_2026-08-03T12-58-47-983Z_048b98df985f.dump';
    assert.equal(classifyBackupFilename(legacyName).kind, 'legacy_predeploy');
    const legacyDate = parseLegacyPredeployTimestamp('2026-08-03T12-58-47-983Z_048b98df985f');
    assert.ok(legacyDate instanceof Date);
    assert.equal(legacyDate.toISOString(), '2026-08-03T12:58:47.983Z');
    assert.equal(
      classifyBackupFilename(legacyName).createdAt.toISOString(),
      '2026-08-03T12:58:47.983Z'
    );

    const now = formatBackupTimestamp(new Date('2026-08-16T01:15:00.000Z'));
    assert.match(now, /^\d{4}-\d{2}-\d{2}T\d{6}$/);
  });
});

describe('backup artifact paths', () => {
  test('relatedBackupArtifacts includes canonical and legacy meta paths', async () => {
    const {
      relatedBackupArtifacts,
      backupMetaPathForDump,
      legacyBackupMetaPathForDump,
    } = await import('../scripts/ops/lib/db-backup-core.mjs');

    const dump = '/tmp/app-daily-2026-08-16T031500.dump';
    const artifacts = relatedBackupArtifacts(dump);
    assert.ok(artifacts.includes(`${dump}.sha256`));
    assert.ok(artifacts.includes(backupMetaPathForDump(dump)));
    assert.ok(artifacts.includes(legacyBackupMetaPathForDump(dump)));

    const legacyDump = '/tmp/predeploy_2026-08-03T12-58-47-983Z_048b98df985f.dump';
    const legacyArtifacts = relatedBackupArtifacts(legacyDump);
    assert.ok(
      legacyArtifacts.includes(
        '/tmp/predeploy_2026-08-03T12-58-47-983Z_048b98df985f.meta.json'
      )
    );
  });
});

describe('backup prune policy', () => {
  test('prunes old daily and old predeploy beyond minimum keep', async () => {
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');
    const { planBackupPrune, executeBackupPrune } = await import(
      '../scripts/ops/lib/backup-prune-core.mjs'
    );
    const { relatedBackupArtifacts } = await import('../scripts/ops/lib/db-backup-core.mjs');

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-prune-'));
    const now = new Date('2026-08-16T12:00:00.000Z');

    const oldDaily = path.join(dir, 'app-daily-2026-07-01T031500.dump');
    const newDaily = path.join(dir, 'app-daily-2026-08-15T031500.dump');
    const incident = path.join(dir, 'incident_damaged_2026-08-14.dump');

    for (const f of [oldDaily, newDaily, incident]) {
      fs.writeFileSync(f, 'x');
      const d = f.includes('2026-07') ? new Date('2026-07-01T03:15:00Z') : new Date('2026-08-15T03:15:00Z');
      fs.utimesSync(f, d, d);
      for (const artifact of relatedBackupArtifacts(f)) {
        if (artifact !== f) fs.writeFileSync(artifact, '{}');
      }
    }

    const predeployPaths = [];
    const shas = [
      '048b98df985f',
      'e7678a237b78',
      '02f7cbc0792d',
      '6a76225afc59',
      'b46360f4227a',
      '01e65bf9367e',
      '3723323a8704',
      '4dfe37b5f779',
      '3303452434d9',
      'a1b2c3d4e5f6',
    ];
    for (let i = 0; i < 10; i += 1) {
      const day = i < 7 ? `2026-08-${String(10 - i).padStart(2, '0')}` : `2026-06-${String(30 - (i - 7)).padStart(2, '0')}`;
      const f = path.join(
        dir,
        `app-predeploy-${day}T100000-${shas[i]}.dump`
      );
      predeployPaths.push(f);
      fs.writeFileSync(f, 'x');
      const d = new Date(`${day}T10:00:00Z`);
      fs.utimesSync(f, d, d);
      for (const artifact of relatedBackupArtifacts(f)) {
        if (artifact !== f) fs.writeFileSync(artifact, '{}');
      }
    }

    const plan = planBackupPrune(dir, { dryRun: true, now });
    assert.ok(plan.toDelete.includes(oldDaily));
    assert.ok(plan.toKeep.includes(newDaily));
    assert.ok(plan.toKeep.includes(incident));

    const keptPredeploy = predeployPaths.filter((p) => plan.toKeep.includes(p));
    const deletedPredeploy = predeployPaths.filter((p) => plan.toDelete.includes(p));
    assert.equal(keptPredeploy.length, 7);
    assert.equal(deletedPredeploy.length, 3);
    for (const p of deletedPredeploy) {
      assert.ok(p.includes('2026-06-'));
    }

    const applied = executeBackupPrune(dir, { dryRun: false, now });
    assert.ok(!fs.existsSync(oldDaily));
    assert.ok(fs.existsSync(newDaily));
    for (const p of deletedPredeploy) {
      assert.ok(!fs.existsSync(p));
      for (const artifact of relatedBackupArtifacts(p)) {
        assert.ok(!fs.existsSync(artifact));
      }
    }
    for (const p of keptPredeploy) {
      assert.ok(fs.existsSync(p));
    }

    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('backup lock', () => {
  test('withBackupLock rejects active holder', async () => {
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');
    const { withBackupLock, acquireBackupLock, releaseBackupLock } = await import(
      '../scripts/ops/lib/db-backup-core.mjs'
    );

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-lock-'));
    const lockPath = path.join(dir, '.app-backup.lock');
    const held = acquireBackupLock(lockPath, 'test-holder');
    try {
      await assert.rejects(() => withBackupLock(dir, async () => 'ok', 'contender'), /BACKUP_LOCK_HELD/);
    } finally {
      releaseBackupLock(held);
    }

    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('withBackupLock reclaims stale lock from dead pid', async () => {
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');
    const { withBackupLock } = await import('../scripts/ops/lib/db-backup-core.mjs');

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-lock-stale-'));
    const lockPath = path.join(dir, '.app-backup.lock');
    fs.writeFileSync(
      lockPath,
      `${JSON.stringify({ pid: 999999, startedAt: Date.now(), operation: 'dead' })}\n`
    );

    const result = await withBackupLock(dir, async () => 'reclaimed', 'daily');
    assert.equal(result, 'reclaimed');
    assert.equal(fs.existsSync(lockPath), false);

    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('withBackupLock finally skips lock release in signal shutdown mode', async () => {
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');
    const {
      withBackupLock,
      setBackupLockShutdownModeForTests,
      BACKUP_LOCK_FILENAME,
    } = await import('../scripts/ops/lib/db-backup-core.mjs');

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-lock-finally-'));
    fs.chmodSync(dir, 0o700);
    const lockPath = path.join(dir, BACKUP_LOCK_FILENAME);

    try {
      await withBackupLock(dir, async () => {
        setBackupLockShutdownModeForTests('signal');
      });
      assert.equal(fs.existsSync(lockPath), true);
    } finally {
      setBackupLockShutdownModeForTests('none');
      if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('terminateBackupProcessOnSignal retains lock and exits with signal code', async () => {
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');
    const {
      acquireBackupLock,
      releaseBackupLock,
      terminateBackupProcessOnSignal,
      BACKUP_SIGNAL_EXIT_CODES,
    } = await import('../scripts/ops/lib/db-backup-core.mjs');

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-lock-signal-unit-'));
    fs.chmodSync(dir, 0o700);
    const lockPath = path.join(dir, '.app-backup.lock');
    const lock = acquireBackupLock(lockPath, 'unit-test');

    const originalExit = process.exit;
    /** @type {number | undefined} */
    let exitCode;
    process.exit = (code) => {
      exitCode = code;
    };

    try {
      terminateBackupProcessOnSignal('SIGTERM');
      assert.equal(exitCode, BACKUP_SIGNAL_EXIT_CODES.SIGTERM);
      assert.equal(fs.existsSync(lockPath), true);
    } finally {
      process.exit = originalExit;
      releaseBackupLock(lock);
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
