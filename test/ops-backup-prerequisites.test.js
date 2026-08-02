'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execSync } = require('child_process');

describe('backup prerequisites', () => {
  test('refuses backup dir under web public path outside repo', async () => {
    const { assertBackupDirectorySafe } = await import('../scripts/ops/lib/backup-prerequisites.mjs');
    const repo = '/opt/app/family-app';
    const unsafe = '/var/www/html/backups';
    assert.throws(() => assertBackupDirectorySafe(unsafe, repo), /BACKUP_DIR_UNSAFE_LOCATION/);
  });

  test('refuses backup dir inside repo root', async () => {
    const { assertBackupDirectorySafe } = await import('../scripts/ops/lib/backup-prerequisites.mjs');
    const repo = '/var/www/family-app';
    assert.throws(() => assertBackupDirectorySafe(repo, repo), /BACKUP_DIR_INSIDE_APP_TREE/);
  });

  test('toolchain includes pg_dump and sha helper', async (t) => {
    try {
      execSync('which pg_dump', { stdio: 'pipe' });
    } catch {
      t.skip('pg_dump not installed');
      return;
    }
    const { assertBackupToolchain } = await import('../scripts/ops/lib/backup-prerequisites.mjs');
    assert.doesNotThrow(() => assertBackupToolchain());
  });
});
