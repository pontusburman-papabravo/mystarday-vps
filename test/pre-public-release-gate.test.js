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
  PROFILES,
  DEFAULT_PROFILE,
} = require('../scripts/lib/pre-public-release-gate/constants.cjs');
const { AREAS, EXTRA_UNIT, EXTRA_DB, allAreaFiles } = require('../scripts/lib/pre-public-release-gate/manifest.cjs');
const { checkMigrationFlagSeeds, gateSourceMustNotMutateFlags } = require('../scripts/lib/pre-public-release-gate/flags.cjs');
const { checkKillSwitchSourceDefaults } = require('../scripts/lib/pre-public-release-gate/kill-switches.cjs');
const { deviceQaAttestation } = require('../scripts/lib/pre-public-release-gate/prod.cjs');
const { classifyOverall } = require('../scripts/lib/pre-public-release-gate/report.cjs');
const { isRepairAllowedDatabase } = require('../scripts/lib/pre-public-release-gate/local-flag-repair.cjs');

test('npm script release:pre-public-gate is defined', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.match(pkg.scripts['release:pre-public-gate'], /pre-public-release-gate\.mjs/);
  assert.match(pkg.scripts['bootstrap:local-feature-flags'], /bootstrap-local-feature-flags\.mjs/);
});

test('default profile is public-runtime', () => {
  assert.equal(DEFAULT_PROFILE, PROFILES.PUBLIC_RUNTIME);
  const src = fs.readFileSync(path.join(ROOT, 'scripts/pre-public-release-gate.mjs'), 'utf8');
  assert.match(src, /DEFAULT_PROFILE/);
  assert.match(src, /--profile=/);
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

test('migrate.js does not run unconditional feature_flag repair', () => {
  const src = fs.readFileSync(path.join(ROOT, 'migrate.js'), 'utf8');
  assert.doesNotMatch(src, /ensureFeatureFlagSeeds/);
});

test('gate uses local-only flag repair helper', () => {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/pre-public-release-gate.mjs'), 'utf8');
  assert.match(src, /repairMissingFeatureFlagSeeds/);
  assert.match(src, /local-flag-repair/);
  assert.doesNotMatch(src, /ensureFeatureFlagSeeds/);
});

test('local flag repair refuses non-local DATABASE_URL', () => {
  assert.equal(isRepairAllowedDatabase('postgresql://u:p@db.example.com:5432/prod'), false);
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

test('classifyOverall public-runtime: android NOT_VERIFIED does not block GO', () => {
  const r = classifyOverall({
    profile: PROFILES.PUBLIC_RUNTIME,
    sections: {
      family_device: { status: STATUS.PASS },
      parent_pin_handoff: { status: STATUS.PASS },
      child_runtime: { status: STATUS.PASS },
      activity_timer: { status: STATUS.PASS },
      image_library: { status: STATUS.PASS },
      avatars: { status: STATUS.PASS },
      android: {
        status: STATUS.PASS,
        checks: [
          { id: 'automated_tests', status: STATUS.PASS },
          { id: 'android_signing', status: STATUS.NOT_VERIFIED, advisory: true },
          { id: 'android_device_qa', status: STATUS.NOT_VERIFIED, advisory: true },
        ],
      },
      ios_native: {
        status: STATUS.PASS,
        checks: [
          { id: 'automated_tests', status: STATUS.PASS },
          { id: 'ios_device_qa', status: STATUS.NOT_VERIFIED, advisory: true },
        ],
      },
      widget: { status: STATUS.EXCLUDED },
      ci_health: { status: STATUS.PASS },
      migrations: { status: STATUS.PASS },
      flags: { status: STATUS.PASS },
      kill_switches: { status: STATUS.PASS },
      prod_acceptance: { status: STATUS.NOT_VERIFIED, optional: true },
    },
  });
  assert.equal(r.runtimeReadiness.status, STATUS.PASS);
  assert.equal(r.nativeStoreReadiness.status, STATUS.NOT_VERIFIED);
  assert.equal(r.overallStatus, STATUS.PASS);
  assert.equal(r.exitCode, EXIT.GO);
  assert.equal(r.decision, 'PUBLIC-RUNTIME GATE READY');
});

test('classifyOverall native-store: device attestation NOT_VERIFIED blocks GO', () => {
  const r = classifyOverall({
    profile: PROFILES.NATIVE_STORE,
    sections: {
      family_device: { status: STATUS.PASS },
      parent_pin_handoff: { status: STATUS.PASS },
      child_runtime: { status: STATUS.PASS },
      activity_timer: { status: STATUS.PASS },
      image_library: { status: STATUS.PASS },
      avatars: { status: STATUS.PASS },
      android: {
        status: STATUS.NOT_VERIFIED,
        checks: [
          { id: 'automated_tests', status: STATUS.PASS },
          { id: 'android_signing', status: STATUS.NOT_VERIFIED },
          { id: 'android_device_qa', status: STATUS.NOT_VERIFIED },
        ],
      },
      ios_native: { status: STATUS.PASS, checks: [{ id: 'automated_tests', status: STATUS.PASS }] },
      widget: { status: STATUS.EXCLUDED },
      ci_health: { status: STATUS.PASS },
      migrations: { status: STATUS.PASS },
      flags: { status: STATUS.PASS },
      kill_switches: { status: STATUS.PASS },
      prod_acceptance: { status: STATUS.PASS, optional: true },
    },
  });
  assert.equal(r.overallStatus, STATUS.NOT_VERIFIED);
  assert.equal(r.exitCode, EXIT.NOT_VERIFIED);
  assert.equal(r.nativeStoreReadiness.status, STATUS.NOT_VERIFIED);
});

test('classifyOverall: BLOCKER wins over NOT_VERIFIED', () => {
  const r = classifyOverall({
    profile: PROFILES.PUBLIC_RUNTIME,
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
  assert.equal(r.overallStatus, STATUS.PASS);
  assert.equal(r.exitCode, EXIT.GO);
});

test('orchestrator never enables widget flags', () => {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/pre-public-release-gate.mjs'), 'utf8');
  assert.doesNotMatch(src, /PRE_PUBLIC_GATE_ENABLE_WIDGET/);
  assert.doesNotMatch(src, /native_widget_enabled['"]\s*,\s*true/);
  assert.doesNotMatch(src, /widget_completion_enabled['"]\s*,\s*true/);
});

test('orchestrator --help starts (no TDZ on require)', () => {
  const { spawnSync } = require('child_process');
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/pre-public-release-gate.mjs'), '--help'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'test' },
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /public-runtime/);
  assert.match(r.stdout, /native-store/);
});

test('admin release-readiness route exists in system.js', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/routes/admin/system.js'), 'utf8');
  assert.match(src, /router\.get\('\/release-readiness'/);
  assert.match(src, /authzHardeningEnabled/);
  assert.match(src, /rateLimitEnabled/);
  assert.doesNotMatch(src, /process\.env\.JWT_SECRET/);
});

test('test runner env matches CI rate-limit kill switch', () => {
  const src = fs.readFileSync(
    path.join(ROOT, 'scripts/lib/pre-public-release-gate/run-checks.cjs'),
    'utf8'
  );
  assert.match(src, /RATE_LIMIT_ENABLED = 'false'/);
  const ci = fs.readFileSync(path.join(ROOT, '.github/workflows/ci.yml'), 'utf8');
  assert.match(ci, /RATE_LIMIT_ENABLED:\s*'false'/);
});

test('parseFailedFiles reads test path from TAP location YAML', () => {
  const { parseFailedFiles } = require('../scripts/lib/pre-public-release-gate/run-checks.cjs');
  const tap = `
    not ok 5 - P1-5: no unlock_method fail-closed without family PIN
      ---
      duration_ms: 1
      location: '/workspace/test/trusted-profile-p1-remediation.integration.test.js:289:1'
      failureType: 'testCodeFailure'
      ...
not ok 358 - P1 remediation: trusted profile picker security matrix
`;
  const parsed = parseFailedFiles(tap);
  assert.ok(
    parsed.failed.includes('test/trusted-profile-p1-remediation.integration.test.js'),
    JSON.stringify(parsed)
  );
});
