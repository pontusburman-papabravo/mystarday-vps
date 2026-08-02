'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

describe('deploy database phase execution', () => {
  test('backup gate failure blocks migrate, restart, and health', async () => {
    const { runDeployDatabasePhases } = await import('../scripts/ops/lib/deploy-database-phases-core.mjs');
    const calls = { migrate: 0, restart: 0, health: 0 };
    const result = await runDeployDatabasePhases({
      snapshot: async () => true,
      backupGate: async () => false,
      migrate: async () => {
        calls.migrate += 1;
        return true;
      },
      restart: async () => {
        calls.restart += 1;
        return true;
      },
      health: async () => {
        calls.health += 1;
        return true;
      },
      postSnapshotCompare: async () => true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.failed, 'backup_gate');
    assert.deepEqual(result.executed, ['pre_snapshot']);
    assert.equal(calls.migrate, 0);
    assert.equal(calls.restart, 0);
    assert.equal(calls.health, 0);
  });

  test('backup gate pass runs exactly one migrate', async () => {
    const { runDeployDatabasePhases } = await import('../scripts/ops/lib/deploy-database-phases-core.mjs');
    let migrateRuns = 0;
    const result = await runDeployDatabasePhases({
      snapshot: async () => true,
      backupGate: async () => true,
      migrate: async () => {
        migrateRuns += 1;
        return true;
      },
      restart: async () => true,
      health: async () => true,
      postSnapshotCompare: async () => true,
    });
    assert.equal(result.ok, true);
    assert.equal(migrateRuns, 1);
    assert.deepEqual(result.executed, [
      'pre_snapshot',
      'backup_gate',
      'migrate',
      'restart',
      'health',
      'post_snapshot_compare',
    ]);
  });
});
