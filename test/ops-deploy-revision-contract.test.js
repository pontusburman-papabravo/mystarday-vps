'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DEPLOY_SH = path.join(__dirname, '../scripts/vps-deploy-revision.sh');
const MIGRATE_JS = path.join(__dirname, '../migrate.js');

describe('vps-deploy-revision database safety contract', () => {
  test('backup gate runs before npm run migrate', () => {
    const sh = fs.readFileSync(DEPLOY_SH, 'utf8');
    const gateIdx = sh.indexOf('pre-deploy-backup-gate');
    const migIdx = sh.indexOf('npm run migrate');
    assert.ok(gateIdx > -1, 'backup gate missing');
    assert.ok(migIdx > gateIdx, 'migrate must run after backup gate');
  });

  test('pre-deploy snapshot runs before backup gate', () => {
    const sh = fs.readFileSync(DEPLOY_SH, 'utf8');
    const snapIdx = sh.indexOf('db-integrity-snapshot.mjs');
    const gateIdx = sh.indexOf('pre-deploy-backup-gate');
    assert.ok(snapIdx > -1 && gateIdx > snapIdx);
  });

  test('sets BACKUP_REQUIRED default for VPS deploy', () => {
    const sh = fs.readFileSync(DEPLOY_SH, 'utf8');
    assert.match(sh, /BACKUP_REQUIRED="\$\{BACKUP_REQUIRED:-1\}"/);
    assert.match(sh, /APP_DEPLOY_PRODUCTION="\$\{APP_DEPLOY_PRODUCTION:-1\}"/);
  });

  test('post-deploy snapshot compare after health', () => {
    const sh = fs.readFileSync(DEPLOY_SH, 'utf8');
    assert.match(sh, /compare-db-snapshots\.mjs/);
    const healthIdx = sh.indexOf('health check');
    const compareIdx = sh.indexOf('compare-db-snapshots.mjs');
    assert.ok(compareIdx > healthIdx);
  });

  test('migrate is invoked exactly once per deploy script path', () => {
    const sh = fs.readFileSync(DEPLOY_SH, 'utf8');
    const matches = sh.match(/npm run migrate/g) || [];
    assert.equal(matches.length, 1);
  });

  test('migrate.js advisory lock contract when present', () => {
    const src = fs.readFileSync(MIGRATE_JS, 'utf8');
    if (!src.includes('pg_try_advisory_lock')) {
      assert.ok(src.includes('runFolderMigrations'), 'migrate runner present without advisory lock on main');
      return;
    }
    assert.match(src, /pg_advisory_unlock/);
    assert.match(src, /finally/);
  });
});
