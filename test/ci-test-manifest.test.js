'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const CRITICAL_INTEGRATION = [
  'test/rewards-integrity.integration.test.js',
  'test/rewards-revoked-access.integration.test.js',
  'test/rate-limit-behavior.integration.test.js',
  'test/child-login-cross-family.integration.test.js',
  'test/reward-visibility.integration.test.js',
  'test/reward-delete-history.integration.test.js',
  'test/pin-warning-revoked-parent.integration.test.js',
  'test/ratings-revoked-parent.integration.test.js',
  'test/schedules-revoked-parent.integration.test.js',
  'test/parent-session-handoff.integration.test.js',
  'test/trusted-device-child.integration.test.js',
  'test/r43-shared-device.integration.test.js',
  'test/r44-adult-child-access.integration.test.js',
  'test/r45-widget-completion.integration.test.js',
  'test/r45b-widget-server-parity.integration.test.js',
  'test/r45f-widget-family-multichild.integration.test.js',
  'test/r45g-widget-polish.integration.test.js',
  'test/iap-webhook-ordering.integration.test.js',
];

const CRITICAL_UNIT = [
  'test/rate-limit-buckets.test.js',
  'test/safe-url-fetch.test.js',
  'test/parent-session-backup-security.test.js',
  'test/ci-test-manifest.test.js',
  'test/iap-client-config.test.js',
  'test/scheduler-registry-contract.test.js',
];

test('critical integration tests are listed in test:gate:db', () => {
  const gate = pkg.scripts['test:gate:db'];
  for (const file of CRITICAL_INTEGRATION) {
    assert.match(gate, new RegExp(file.replace(/\./g, '\\.')), `${file} missing from test:gate:db`);
  }
});

test('critical unit/security tests are listed in test:gate:unit', () => {
  const gate = pkg.scripts['test:gate:unit'];
  for (const file of CRITICAL_UNIT) {
    assert.match(gate, new RegExp(file.replace(/\./g, '\\.')), `${file} missing from test:gate:unit`);
  }
});
