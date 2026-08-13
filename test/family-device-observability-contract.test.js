'use strict';

/**
 * Rollout observability — allowlisted telemetry for family-device failure spikes.
 * No PIN, token, or PII in log channels.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const ROLLOUT_EVENTS = [
  'child_context_restore_failed',
  'stale_child_response_discarded',
  'child_access_denied',
  'adult_privilege_unlock_failed',
  'adult_privilege_unlock_started',
  'adult_privilege_unlock_success',
  'adult_privilege_expired',
  'device_access_revoked',
  'shared_device_picker_shown',
  'shared_device_child_selected',
  'child_context_switched',
  'child_login_failed',
  'adult_login_failed',
];

test('analytics allowlist includes family-device rollout spike events', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/routes/analytics.js'), 'utf8');
  const missing = ROLLOUT_EVENTS.filter((ev) => !src.includes(`'${ev}'`));
  assert.deepEqual(missing, [], `missing allowlist events: ${missing.join(', ')}`);
});

test('trusted-select-parent-diag uses sanitized client-log channel (no secrets)', () => {
  const diag = fs.readFileSync(path.join(ROOT, 'public/js/trusted-select-parent-diag.js'), 'utf8');
  assert.match(diag, /trusted_profile_unlock/);
  assert.match(diag, /safeKeys/);
  assert.doesNotMatch(diag, /password|pin|token|Bearer/i);
  const routes = fs.readFileSync(path.join(ROOT, 'src/routes/public.js'), 'utf8');
  assert.match(routes, /trusted_profile_unlock/);
});

test('trusted-device restore failure emits allowlisted analytics event', () => {
  const bootstrap = fs.readFileSync(path.join(ROOT, 'public/js/trusted-device-bootstrap.js'), 'utf8');
  assert.match(bootstrap, /child_context_restore_failed/);
  assert.doesNotMatch(bootstrap, /track\([^)]*pin/i);
});

test('adult-privilege client tracks unlock failure without PIN in metadata', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/adult-privilege.js'), 'utf8');
  assert.match(src, /adult_privilege_unlock_failed/);
  assert.match(src, /adult_privilege_unlock_success/);
  assert.doesNotMatch(src, /track\([^)]*\bpin\b/i);
});

test('support diagnostics allowlist excludes credential fields', () => {
  const mod = require('../src/lib/support-diagnostics');
  const keys = mod.ALLOWED_KEYS || [];
  assert.ok(keys.length > 0);
  for (const forbidden of ['pin', 'password', 'token', 'refresh_token']) {
    assert.ok(!keys.includes(forbidden), `forbidden key in allowlist: ${forbidden}`);
  }
});

test('client-log handler rejects unknown channels', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/routes/public.js'), 'utf8');
  assert.match(src, /CLIENT_LOG_CHANNELS/);
  assert.match(src, /trusted_profile_unlock/);
});
