'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

test('widget-bridge-client is no-op without Capacitor native', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/widget-bridge-client.js'), 'utf8');
  const sandbox = { window: {}, Capacitor: { isNativePlatform: () => false, Plugins: {} } };
  sandbox.globalThis = sandbox.window;
  vm.runInNewContext(src, sandbox, { context: sandbox });
  assert.ok(sandbox.window.WidgetBridgeClient);
  return sandbox.window.WidgetBridgeClient.getStatus().then((s) => {
    assert.equal(s.hasBinding, false);
    assert.equal(s.platform, 'web');
  });
});

test('widget-installation-id generates non-PII id', async () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/widget-installation-id.js'), 'utf8');
  const sandbox = {
    window: {
      crypto: { randomUUID: () => '11111111-1111-4111-8111-111111111111' },
      sessionStorage: {
        _m: {},
        getItem(k) { return this._m[k] || null; },
        setItem(k, v) { this._m[k] = v; },
      },
    },
    Capacitor: { isNativePlatform: () => false },
  };
  sandbox.globalThis = sandbox.window;
  vm.runInNewContext(src, sandbox, { context: sandbox });
  const id = await sandbox.window.WidgetInstallationId.getOrCreate();
  assert.match(id, /^[0-9a-f-]{36}$/);
  assert.ok(!id.includes('@'));
});

test('capacitor-widget-bridge package exposes WidgetBridge plugin name', () => {
  const plugin = require(path.join(ROOT, 'plugins/capacitor-widget-bridge/dist/plugin.cjs.js'));
  assert.ok(plugin.WidgetBridge);
});

test('verify-widget-bridge-native script passes', () => {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/verify-widget-bridge-native.mjs'), 'utf8');
  assert.match(src, /WidgetBridgePlugin\.swift/);
});

test('platform-html injects widget bridge scripts', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/middleware/platform-html.js'), 'utf8');
  assert.match(src, /widget-bridge-bootstrap\.js/);
  assert.match(src, /widget-bridge-provision\.js/);
});

test('widget-bridge-bootstrap clears on auth logout event', () => {
  const bootstrap = fs.readFileSync(path.join(ROOT, 'public/js/widget-bridge-bootstrap.js'), 'utf8');
  assert.match(bootstrap, /stjarndag:auth-logout/);
  assert.match(bootstrap, /clearBindings/);
});
