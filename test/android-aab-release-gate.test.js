'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const script = path.join(ROOT, 'scripts/build-android-aab.mjs');

test('android:aab release mode fails closed without signing secrets', () => {
  const r = spawnSync(process.execPath, [script], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      ANDROID_AAB_ALLOW_DEV_KEYSTORE: '',
      ANDROID_KEYSTORE_PASSWORD: '',
      ANDROID_KEY_ALIAS: '',
      GOOGLE_WEB_CLIENT_ID: '',
    },
  });
  assert.notEqual(r.status, 0);
  const out = (r.stdout || '') + (r.stderr || '');
  assert.match(out, /keystore|ANDROID_KEYSTORE|GOOGLE_WEB_CLIENT_ID|google-services\.json/i);
});

test('android configure activity fails closed on rebind failure (source)', () => {
  const fs = require('fs');
  const java = fs.readFileSync(
    path.join(
      ROOT,
      'plugins/capacitor-widget-bridge/android/src/main/java/com/stjarndag/widgetbridge/widget/RoutineWidgetConfigureActivity.java'
    ),
    'utf8'
  );
  assert.match(java, /selected\.id\.equals\(childId\)/);
  assert.match(java, /runOnUiThread\(this::finishCancel\)/);
});

test('iOS WidgetBridgeStore clearAll removes scoped keychain accounts', () => {
  const fs = require('fs');
  const swift = fs.readFileSync(
    path.join(ROOT, 'plugins/capacitor-widget-bridge/ios/Plugin/WidgetBridgeStore.swift'),
    'utf8'
  );
  assert.match(swift, /knownBindingScopes/);
  assert.match(swift, /deleteKeychain\(account: keychainAccount/);
});
