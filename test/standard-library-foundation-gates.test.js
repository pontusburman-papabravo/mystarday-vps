'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { STEP_ID_PATTERN } = require('../src/lib/standard-library-manifest-schema');

const ROOT = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const baselineSql = fs.readFileSync(path.join(ROOT, 'db/baseline-schema.sql'), 'utf8');

const STANDARD_LIBRARY_UNIT_TESTS = [
  'test/standard-library-manifest.test.js',
  'test/standard-library-sync.test.js',
  'test/standard-library-backfill.test.js',
  'test/standard-library-foundation-gates.test.js',
];

const STANDARD_LIBRARY_DB_TESTS = [
  'test/standard-library-v11-foundation.test.js',
];

function runNodeScript(script, args = [], env = {}) {
  try {
    const stdout = execFileSync(process.execPath, [script, ...args], {
      cwd: ROOT,
      env: { ...process.env, ...env },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, stdout, stderr: '' };
  } catch (err) {
    return {
      status: err.status ?? 1,
      stdout: err.stdout || '',
      stderr: err.stderr || '',
    };
  }
}

describe('standard library foundation gates', () => {
  it('lists manifest/sync/gates tests in test:gate:unit', () => {
    const gate = pkg.scripts['test:gate:unit'];
    for (const file of STANDARD_LIBRARY_UNIT_TESTS) {
      assert.match(gate, new RegExp(file.replace(/\./g, '\\.')), `${file} missing from test:gate:unit`);
    }
  });

  it('lists foundation DB test in test:gate:db', () => {
    const gate = pkg.scripts['test:gate:db'];
    for (const file of STANDARD_LIBRARY_DB_TESTS) {
      assert.match(gate, new RegExp(file.replace(/\./g, '\\.')), `${file} missing from test:gate:db`);
    }
  });

  it('exposes validate, sync, and backfill scripts without wiring sync into build', () => {
    assert.equal(pkg.scripts['validate:standard-library'], 'node scripts/validate-standard-library.js');
    assert.equal(pkg.scripts['sync:standard-library'], 'node scripts/sync-standard-library.js');
    assert.equal(pkg.scripts['backfill:standard-library'], 'node scripts/backfill-standard-library.js');
    assert.doesNotMatch(pkg.scripts.build, /sync:standard-library/);
    assert.doesNotMatch(pkg.scripts.build, /validate:standard-library/);
    assert.doesNotMatch(pkg.scripts.build, /backfill:standard-library/);
  });

  it('baseline includes PR1 canonical columns on affected tables', () => {
    const datBlock = baselineSql.match(
      /CREATE TABLE IF NOT EXISTS default_activity_template[\s\S]*?\);/
    )?.[0] || '';
    for (const col of [
      'seven_questions',
      'package_component',
      'canonical_id',
      'name_i18n',
      'icon_key',
      'duration_seconds',
      'variants',
      'deprecated',
    ]) {
      assert.match(datBlock, new RegExp(`\\b${col}\\b`), `default_activity_template missing ${col}`);
    }

    const scheduleBlock = baselineSql.match(
      /CREATE TABLE IF NOT EXISTS default_schedule[\s\S]*?\);/
    )?.[0] || '';
    for (const col of ['canonical_id', 'name_i18n', 'description_i18n', 'deprecated']) {
      assert.match(scheduleBlock, new RegExp(`\\b${col}\\b`), `default_schedule missing ${col}`);
    }

    const itemBlock = baselineSql.match(
      /CREATE TABLE IF NOT EXISTS default_schedule_item[\s\S]*?\);/
    )?.[0] || '';
    for (const col of ['is_optional', 'variant_key', 'default_activity_template_id']) {
      assert.match(itemBlock, new RegExp(`\\b${col}\\b`), `default_schedule_item missing ${col}`);
    }

    const activityBlock = baselineSql.match(
      /CREATE TABLE IF NOT EXISTS activity_template[\s\S]*?\);/
    )?.[0] || '';
    for (const col of [
      'seven_questions',
      'icon_key',
      'duration_seconds',
      'image_url',
      'for_dig_goal_slug',
      'source_default_activity_id',
      'source_canonical_id',
    ]) {
      assert.match(activityBlock, new RegExp(`\\b${col}\\b`), `activity_template missing ${col}`);
    }

    assert.match(baselineSql, /idx_default_activity_template_canonical_id/);
    assert.match(baselineSql, /idx_default_schedule_canonical_id/);
    assert.match(baselineSql, /activity_template_source_default_activity_id_fkey/);
  });

  it('accepts multi-segment variant step IDs via regex', () => {
    assert.match('after_school.after_school_club.arrive', STEP_ID_PATTERN);
    assert.match('after_school.after_school_club.play_outside', STEP_ID_PATTERN);
  });
});

describe('standard library CLI contracts', () => {
  it('validate:standard-library exits 0 on valid fixture', () => {
    const out = runNodeScript('scripts/validate-standard-library.js');
    assert.equal(out.status, 0);
  });

  it('validate:standard-library exits 1 on invalid manifest file', () => {
    const badPath = path.join(ROOT, 'test/fixtures/standard-library-invalid-manifest.json');
    const out = runNodeScript('scripts/validate-standard-library.js', [badPath]);
    assert.equal(out.status, 1);
  });

  it('sync:standard-library --help documents dry-run and exit codes', () => {
    const out = runNodeScript('scripts/sync-standard-library.js', ['--help']);
    assert.equal(out.status, 0);
    const help = out.stdout;
    assert.match(help, /--dry-run/i);
    assert.match(help, /Exit codes:/i);
    assert.match(help, /0\s+Success/i);
    assert.match(help, /1\s+Manifest validation failure/i);
    assert.match(help, /2\s+Database \/ sync failure/i);
    assert.match(help, /not run automatically during deploy or npm run build/i);
  });

  it('sync:standard-library exits 2 without DATABASE_URL', () => {
    const out = runNodeScript('scripts/sync-standard-library.js', ['--dry-run'], {
      DATABASE_URL: '',
    });
    assert.equal(out.status, 2);
    assert.match(out.stderr, /DATABASE_URL is required/i);
  });

  it('sync:standard-library exits 1 on manifest validation failure', () => {
    if (!process.env.DATABASE_URL) {
      return;
    }
    const badPath = path.join(ROOT, 'test/fixtures/standard-library-invalid-manifest.json');
    const out = runNodeScript(
      'scripts/sync-standard-library.js',
      ['--dry-run', '--manifest', badPath],
      { NODE_ENV: 'test' }
    );
    assert.equal(out.status, 1);
    assert.match(out.stderr, /Manifest validation failed/i);
  });
});
