'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const {
  STATUS,
  EXIT,
  FLAGS_MUST_BE_OFF,
  FAMILY_DEVICE_FLAGS,
  WIDGET_FLAGS,
} = require('../scripts/lib/pre-public-release-gate/constants.cjs');
const { AREAS, EXTRA_UNIT, EXTRA_DB, allAreaFiles } = require('../scripts/lib/pre-public-release-gate/manifest.cjs');
const { checkMigrationFlagSeeds, gateSourceMustNotMutateFlags } = require('../scripts/lib/pre-public-release-gate/flags.cjs');
const { checkKillSwitchSourceDefaults } = require('../scripts/lib/pre-public-release-gate/kill-switches.cjs');
const { deviceQaAttestation } = require('../scripts/lib/pre-public-release-gate/prod.cjs');
const { classifyOverall } = require('../scripts/lib/pre-public-release-gate/report.cjs');

test('npm script release:pre-public-gate is defined', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.match(pkg.scripts['release:pre-public-gate'], /pre-public-release-gate\.mjs/);
});

test('widget is excluded from area test execution', () => {
  assert.equal(AREAS.widget.excluded, true);
  assert.deepEqual(AREAS.widget.unit, []);
  assert.deepEqual(AREAS.widget.db, []);
});

test('widget flags are still in the must-be-off set', () => {
  for (const key of WIDGET_FLAGS) {
    assert.ok(FLAGS_MUST_BE_OFF.includes(key), key);
  }
  for (const key of FAMILY_DEVICE_FLAGS) {
    assert.ok(FLAGS_MUST_BE_OFF.includes(key), key);
  }
});

test('manifest files exist on disk', () => {
  const missing = allAreaFiles().filter((f) => !fs.existsSync(path.join(ROOT, f)));
  assert.deepEqual(missing, []);
  for (const f of [...EXTRA_UNIT, ...EXTRA_DB]) {
    assert.ok(fs.existsSync(path.join(ROOT, f)), f);
  }
});

test('migration snapshotContract seeds family-device and widget flags OFF', () => {
  const result = checkMigrationFlagSeeds();
  assert.equal(result.status, STATUS.PASS, JSON.stringify(result.evidence, null, 2));
  for (const key of FLAGS_MUST_BE_OFF) {
    assert.equal(result.evidence.found[key].enabled, false, key);
  }
});

test('kill-switch source defaults are fail-secure', () => {
  const result = checkKillSwitchSourceDefaults();
  assert.equal(result.status, STATUS.PASS, JSON.stringify(result.evidence, null, 2));
});

test('gate source does not mutate feature_flag rows', () => {
  const result = gateSourceMustNotMutateFlags();
  assert.equal(result.status, STATUS.PASS, JSON.stringify(result.evidence, null, 2));
});

test('device QA attestation is never PASS when unset', () => {
  const r = deviceQaAttestation({}, 'PRE_PUBLIC_GATE_IOS_DEVICE_QA', 'ios');
  assert.equal(r.status, STATUS.NOT_VERIFIED);
});

test('device QA attestation PASS is explicit only', () => {
  assert.equal(
    deviceQaAttestation({ PRE_PUBLIC_GATE_IOS_DEVICE_QA: 'PASS' }, 'PRE_PUBLIC_GATE_IOS_DEVICE_QA', 'ios')
      .status,
    STATUS.PASS
  );
  assert.equal(
    deviceQaAttestation({ PRE_PUBLIC_GATE_IOS_DEVICE_QA: 'yes' }, 'PRE_PUBLIC_GATE_IOS_DEVICE_QA', 'ios')
      .status,
    STATUS.BLOCKER
  );
});

test('classifyOverall: BLOCKER wins over NOT_VERIFIED', () => {
  const r = classifyOverall({
    sections: {
      family_device: { status: STATUS.PASS },
      parent_pin_handoff: { status: STATUS.PASS },
      child_runtime: { status: STATUS.PASS },
      activity_timer: { status: STATUS.PASS },
      image_library: { status: STATUS.PASS },
      avatars: { status: STATUS.PASS },
      android: { status: STATUS.BLOCKER },
      ios_native: { status: STATUS.NOT_VERIFIED },
      widget: { status: STATUS.EXCLUDED },
      ci_health: { status: STATUS.PASS },
      migrations: { status: STATUS.PASS },
      flags: { status: STATUS.PASS },
      kill_switches: { status: STATUS.PASS },
      prod_acceptance: { status: STATUS.PASS, optional: true },
    },
  });
  assert.equal(r.overallStatus, STATUS.BLOCKER);
  assert.equal(r.exitCode, EXIT.BLOCKER);
  assert.equal(r.overall, 'BLOCKED');
});

test('classifyOverall: NOT_VERIFIED is not GO', () => {
  const r = classifyOverall({
    sections: {
      family_device: { status: STATUS.PASS },
      parent_pin_handoff: { status: STATUS.PASS },
      child_runtime: { status: STATUS.PASS },
      activity_timer: { status: STATUS.PASS },
      image_library: { status: STATUS.PASS },
      avatars: { status: STATUS.PASS },
      android: { status: STATUS.NOT_VERIFIED },
      ios_native: { status: STATUS.PASS },
      widget: { status: STATUS.EXCLUDED },
      ci_health: { status: STATUS.PASS },
      migrations: { status: STATUS.PASS },
      flags: { status: STATUS.PASS },
      kill_switches: { status: STATUS.PASS },
      prod_acceptance: { status: STATUS.NOT_VERIFIED, optional: true },
    },
  });
  assert.equal(r.overallStatus, STATUS.NOT_VERIFIED);
  assert.equal(r.exitCode, EXIT.NOT_VERIFIED);
  assert.notEqual(r.exitCode, EXIT.GO);
});

test('classifyOverall: optional prod_acceptance NOT_VERIFIED does not block GO', () => {
  const r = classifyOverall({
    sections: {
      family_device: { status: STATUS.PASS },
      parent_pin_handoff: { status: STATUS.PASS },
      child_runtime: { status: STATUS.PASS },
      activity_timer: { status: STATUS.PASS },
      image_library: { status: STATUS.PASS },
      avatars: { status: STATUS.PASS },
      android: { status: STATUS.PASS },
      ios_native: { status: STATUS.PASS },
      widget: { status: STATUS.EXCLUDED },
      ci_health: { status: STATUS.PASS },
      migrations: { status: STATUS.PASS },
      flags: { status: STATUS.PASS },
      kill_switches: { status: STATUS.PASS },
      prod_acceptance: { status: STATUS.PASS, optional: true },
    },
  });
  assert.equal(r.overallStatus, STATUS.PASS);
  assert.equal(r.exitCode, EXIT.GO);
  assert.equal(r.decision, 'READY FOR PUBLIC ROLLOUT');
});

test('extra scoped tests are listed in test:gate after this change', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const unit = pkg.scripts['test:gate:unit'];
  const db = pkg.scripts['test:gate:db'];
  for (const f of EXTRA_UNIT) {
    assert.match(unit, new RegExp(f.replace(/\./g, '\\.')), f);
  }
  for (const f of EXTRA_DB) {
    assert.match(db, new RegExp(f.replace(/\./g, '\\.')), f);
  }
});

test('orchestrator never enables widget flags', () => {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/pre-public-release-gate.mjs'), 'utf8');
  assert.doesNotMatch(src, /PRE_PUBLIC_GATE_ENABLE_WIDGET/);
  assert.doesNotMatch(src, /native_widget_enabled['"]\s*,\s*true/);
  assert.doesNotMatch(src, /widget_completion_enabled['"]\s*,\s*true/);
  assert.match(src, /Never enables widget/);
});

test('orchestrator --help starts (no TDZ on require)', () => {
  const { spawnSync } = require('child_process');
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/pre-public-release-gate.mjs'), '--help'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'test' },
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /release:pre-public-gate/);
});
