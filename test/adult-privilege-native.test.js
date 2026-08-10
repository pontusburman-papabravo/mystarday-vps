'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

test('capacitor-adult-biometric package exposes AdultBiometric plugin name', () => {
  const plugin = require(path.join(ROOT, 'plugins/capacitor-adult-biometric/dist/plugin.cjs.js'));
  assert.ok(plugin.AdultBiometric);
});

test('iOS AdultBiometric uses LocalAuthentication only', () => {
  const src = fs.readFileSync(
    path.join(ROOT, 'plugins/capacitor-adult-biometric/ios/Plugin/AdultBiometricPlugin.swift'),
    'utf8'
  );
  assert.match(src, /LocalAuthentication/);
  assert.match(src, /deviceOwnerAuthenticationWithBiometrics/);
  assert.doesNotMatch(src, /Keychain/);
});

test('Android AdultBiometric uses BiometricPrompt without credential return', () => {
  const src = fs.readFileSync(
    path.join(
      ROOT,
      'plugins/capacitor-adult-biometric/android/src/main/java/com/stjarndag/adultbiometric/AdultBiometricPlugin.java'
    ),
    'utf8'
  );
  assert.match(src, /BiometricPrompt/);
  assert.doesNotMatch(src, /KeyStore/);
});

test('adult-biometric-client web is unavailable', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/adult-biometric-client.js'), 'utf8');
  const sandbox = { window: {}, Capacitor: { isNativePlatform: () => false, Plugins: {} } };
  sandbox.globalThis = sandbox.window;
  vm.runInNewContext(src, sandbox, { context: sandbox });
  return sandbox.window.AdultBiometricClient.isAvailable().then((s) => {
    assert.equal(s.available, false);
    assert.equal(s.platform, 'web');
  });
});

test('platform-html injects adult privilege scripts', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/middleware/platform-html.js'), 'utf8');
  assert.match(src, /adult-privilege\.js/);
  assert.match(src, /adult-biometric-client\.js/);
});

test('analytics allowlist includes adult_privilege events', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/routes/analytics.js'), 'utf8');
  assert.match(src, /adult_privilege_unlock_started/);
  assert.match(src, /adult_privilege_unlock_success/);
  assert.match(src, /adult_privilege_unlock_failed/);
  assert.match(src, /adult_privilege_expired/);
});

test('child-parent-api-block fails closed when adult_privilege_v1', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/middleware/child-parent-api-block.js'), 'utf8');
  assert.match(src, /isAdultPrivilegeEnabled/);
  assert.match(src, /adultPrivilegeRequired/);
});
