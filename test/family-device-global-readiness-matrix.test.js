'use strict';

/**
 * Family Device Global Readiness — runtime state + transition coverage index.
 * Maps normative rollout matrix to existing automated tests (no global flag enable).
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function assertCoverage(label, files) {
  const missing = files.filter((f) => !exists(f));
  assert.deepEqual(missing, [], `${label}: missing coverage files: ${missing.join(', ')}`);
}

/** Device/session states → tests that assert authority, family_id, child_id, destination. */
const STATE_MATRIX = Object.freeze([
  {
    state: 'no_trusted_device',
    coverage: ['test/family-device-entry.integration.test.js', 'test/app-entry-resolve.test.js'],
    sourceMustMatch: [/failClosed|parent-login|orchestratorActive/i],
  },
  {
    state: 'trusted_device',
    coverage: [
      'test/trusted-device-child.integration.test.js',
      'test/trusted-device-contract.test.js',
    ],
    sourceMustMatch: [/trusted_device|restore/i],
  },
  {
    state: 'revoked',
    coverage: [
      'test/family-device-entry.integration.test.js',
      'test/trusted-device-child.integration.test.js',
    ],
    sourceMustMatch: [/revoked|failClosed|401/i],
  },
  {
    state: 'expired',
    coverage: [
      'test/trusted-device-child.integration.test.js',
      'test/adult-privilege-lock.integration.test.js',
    ],
    sourceMustMatch: [/expir|401|locked/i],
  },
  {
    state: 'parent_session',
    coverage: [
      'test/trusted-device-parent.integration.test.js',
      'test/profile-switch-parent-return.integration.test.js',
    ],
    sourceMustMatch: [/parent-home|type.*parent|credentialContext.*parent/i],
  },
  {
    state: 'child_session',
    coverage: [
      'test/trusted-device-child.integration.test.js',
      'test/r43-child-login-authz.test.js',
    ],
    sourceMustMatch: [/child-home|type.*child|child_id/i],
  },
  {
    state: 'stale_corrupt_local_state',
    coverage: [
      'test/family-device-offline-queue-contract.test.js',
      'test/trusted-profile-final-security.integration.test.js',
    ],
    sourceMustMatch: [/stale|discard|child_id|failClosed/i],
  },
]);

/** Transitions → tests (HTTP semantics beyond bare 200). */
const TRANSITION_MATRIX = Object.freeze([
  {
    transition: 'cold_start',
    coverage: ['test/family-device-entry.integration.test.js', 'test/build-app-entry-input.integration.test.js'],
    asserts: ['destination', 'credentialContext', 'orchestratorActive'],
  },
  {
    transition: 'warm_start',
    coverage: ['test/trusted-device-child.integration.test.js', 'test/child-login-session-resume.test.js'],
    asserts: ['restore', 'session'],
  },
  {
    transition: 'force_close_reopen',
    coverage: ['test/native-child-cold-launch-harness.test.js', 'test/trusted-device-child.integration.test.js'],
    asserts: ['restore', 'cold'],
  },
  {
    transition: 'select_child',
    coverage: ['test/trusted-device-handoff.integration.test.js', 'test/fas-4a-daily-child-ux.test.js'],
    asserts: ['select-child', 'child_id', 'handoff'],
  },
  {
    transition: 'child_a_to_child_b',
    coverage: [
      'test/profile-switch-parent-return.integration.test.js',
      'test/trusted-profile-p1-remediation.integration.test.js',
    ],
    asserts: ['select-child', 'child_id'],
  },
  {
    transition: 'child_to_parent',
    coverage: [
      'test/trusted-profile-final-security.integration.test.js',
      'test/adult-privilege.integration.test.js',
    ],
    asserts: ['select-parent', 'unlockMethod', 'pin'],
  },
  {
    transition: 'correct_parent_pin',
    coverage: [
      'test/trusted-profile-final-security.integration.test.js',
      'test/trusted-device-handoff.integration.test.js',
    ],
    asserts: ['select-parent', '200', 'parent'],
  },
  {
    transition: 'wrong_parent_pin',
    coverage: [
      'test/trusted-profile-p1-remediation.integration.test.js',
      'test/trusted-profile-p1-pin-limiter.integration.test.js',
    ],
    asserts: ['select-parent', '401', '403', '429'],
  },
  {
    transition: 'parent_a_to_parent_b',
    coverage: ['test/r43-shared-device.integration.test.js', 'test/profile-switch-parent-return.integration.test.js'],
    asserts: ['parent_id', 'allowedParents'],
  },
  {
    transition: 'parent_to_child',
    coverage: ['test/trusted-device-handoff.integration.test.js', 'test/fas-4a-daily-child-ux.test.js'],
    asserts: ['select-child', 'child-home'],
  },
  {
    transition: 'logout',
    coverage: [
      'test/parent-child-handoff-logout-jwt.integration.test.js',
      'test/settings-logout-early-bind.test.js',
    ],
    asserts: ['logout', '401'],
  },
  {
    transition: 'revoke',
    coverage: ['test/trusted-device-child.integration.test.js', 'test/r4-final-security-blockers.integration.test.js'],
    asserts: ['revoke', 'DELETE', '401'],
  },
  {
    transition: 'token_session_expiry',
    coverage: ['test/adult-privilege-lock.integration.test.js', 'test/refresh-token-cookie-guard.test.js'],
    asserts: ['expir', '401', 'refresh'],
  },
  {
    transition: 'refresh_cookie_rotation',
    coverage: ['test/parent-handoff-refresh-cookie.integration.test.js', 'test/parent-child-handoff-logout-jwt.integration.test.js'],
    asserts: ['refresh', 'Set-Cookie'],
  },
  {
    transition: 'reconnect',
    coverage: ['test/trusted-device-child.integration.test.js', 'test/family-device-offline-queue-contract.test.js'],
    asserts: ['restore', 'queue'],
  },
]);

/** Family shapes */
const FAMILY_MATRIX = Object.freeze([
  {
    shape: 'one_child',
    coverage: ['test/family-device-entry.integration.test.js', 'test/trusted-device-child.integration.test.js'],
  },
  {
    shape: 'multi_child',
    coverage: [
      'test/family-device-entry.integration.test.js',
      'test/trusted-profile-p1-remediation.integration.test.js',
    ],
  },
  {
    shape: 'multi_parent',
    coverage: ['test/r43-shared-device.integration.test.js', 'test/profile-switch-parent-return.integration.test.js'],
  },
]);

/** Schedule parity after profile switch (parent order = child order). */
const SCHEDULE_PARITY_MATRIX = Object.freeze([
  {
    case: 'normal_day',
    coverage: ['test/child-daily-log-order.integration.test.js', 'test/child-dashboard-order-parity.test.js'],
  },
  {
    case: 'reordered_day',
    coverage: ['test/child-daily-log-order.integration.test.js', 'test/daily-log-reorder.test.js'],
  },
  {
    case: 'substeps',
    coverage: ['test/child-substep-order.integration.test.js', 'test/child-substep-progression.integration.test.js'],
  },
  {
    case: 'special_day',
    coverage: ['test/schedule-section-order-contract.test.js'],
  },
  {
    case: 'profile_switch_refresh',
    coverage: ['test/family-device-schedule-parity-profile-switch.integration.test.js'],
  },
]);

/** #985 permanent regression — Capacitor addListener sync vs Promise. */
const NATIVE_BRIDGE = Object.freeze({
  coverage: ['test/native-bridge-contract.test.js'],
  sourceMustMatch: [/addListener/, /PluginListenerHandle|remove/],
});

test('global readiness: every device/session state has automated coverage', () => {
  for (const row of STATE_MATRIX) {
    assertCoverage(`state:${row.state}`, row.coverage);
    if (row.sourceMustMatch) {
      const combined = row.coverage.map(read).join('\n');
      for (const re of row.sourceMustMatch) {
        assert.match(combined, re, `state ${row.state} missing pattern ${re}`);
      }
    }
  }
});

test('global readiness: every transition has coverage with semantic assertions', () => {
  for (const row of TRANSITION_MATRIX) {
    assertCoverage(`transition:${row.transition}`, row.coverage);
    const combined = row.coverage.map(read).join('\n');
    for (const token of row.asserts) {
      assert.ok(
        combined.includes(token) || new RegExp(token, 'i').test(combined),
        `transition ${row.transition} missing assert token ${token}`
      );
    }
  }
});

test('global readiness: family shapes (one/multi child, multi parent)', () => {
  for (const row of FAMILY_MATRIX) {
    assertCoverage(`family:${row.shape}`, row.coverage);
  }
});

test('global readiness: schedule parity matrix includes profile-switch integration', () => {
  for (const row of SCHEDULE_PARITY_MATRIX) {
    assertCoverage(`schedule:${row.case}`, row.coverage);
  }
});

test('global readiness: #985 native bridge contract in family_device gate scope', () => {
  assertCoverage('native_bridge', NATIVE_BRIDGE.coverage);
  const src = read(NATIVE_BRIDGE.coverage[0]);
  for (const re of NATIVE_BRIDGE.sourceMustMatch) {
    assert.match(src, re);
  }
  const manifest = read('scripts/lib/pre-public-release-gate/manifest.cjs');
  assert.match(manifest, /native-bridge-contract\.test\.js/);
});

test('global readiness: prod pilot harness enforces disposable cleanup contract', () => {
  const core = read('scripts/ops/family-device-prod-pilot-core.cjs');
  assert.match(core, /finally\s*\{/);
  assert.match(core, /deletePilotFamily/);
  assert.match(core, /report\.cleanup/);
  assert.match(core, /report\.cleanup\?\.ok === true/);
  assert.match(core, /report\.ok\s*=/);
  assert.doesNotMatch(core, /UPDATE feature_flag SET enabled\s*=\s*true/i);
});

test('global readiness: four family-device flags remain OFF in migration seeds', () => {
  const constants = require('../scripts/lib/pre-public-release-gate/constants.cjs');
  for (const key of constants.FAMILY_DEVICE_FLAGS) {
    assert.ok(constants.FLAGS_MUST_BE_OFF.includes(key), key);
  }
});
