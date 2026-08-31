'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const script = path.join(ROOT, 'scripts/assert-android-release-signing.mjs');

const tempDirs = [];
after(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function runAssert(env) {
  return spawnSync(process.execPath, [script], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, ANDROID_AAB_ALLOW_DEV_KEYSTORE: '', ...env },
  });
}

function makeTempKeystore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'android-upload-cert-'));
  tempDirs.push(dir);
  const keystorePath = path.join(dir, 'upload.keystore');
  const storePass = 'test-store-pass';
  const alias = 'upload';
  const gen = spawnSync(
    'keytool',
    [
      '-genkeypair',
      '-keystore',
      keystorePath,
      '-alias',
      alias,
      '-keyalg',
      'RSA',
      '-keysize',
      '2048',
      '-validity',
      '1',
      '-storepass',
      storePass,
      '-keypass',
      storePass,
      '-dname',
      'CN=AAB Integrity Test, OU=Test, O=Test, L=Test, ST=Test, C=SE',
    ],
    { encoding: 'utf8' }
  );
  if (gen.status !== 0) {
    throw new Error((gen.stdout || '') + (gen.stderr || ''));
  }
  const listed = spawnSync(
    'keytool',
    ['-list', '-v', '-keystore', keystorePath, '-alias', alias, '-storepass', storePass],
    { encoding: 'utf8' }
  );
  const m = `${listed.stdout || ''}${listed.stderr || ''}`.match(/SHA256:\s*([0-9A-F:]+)/i);
  if (!m) {
    throw new Error('keytool did not print SHA256');
  }
  return { keystorePath, storePass, alias, sha256: m[1].trim().toUpperCase() };
}

const releaseSecrets = (ks, extra = {}) => ({
  ANDROID_KEYSTORE_PATH: ks.keystorePath,
  ANDROID_KEYSTORE_PASSWORD: ks.storePass,
  ANDROID_KEY_ALIAS: ks.alias,
  ANDROID_KEY_PASSWORD: ks.storePass,
  GOOGLE_WEB_CLIENT_ID: 'integrity-test.apps.googleusercontent.com',
  ...extra,
});

test('android:aab release mode fails closed without signing secrets', () => {
  const r = runAssert({
    ANDROID_KEYSTORE_PASSWORD: '',
    ANDROID_KEY_ALIAS: '',
    GOOGLE_WEB_CLIENT_ID: '',
    ANDROID_UPLOAD_CERT_SHA256: '',
  });
  assert.notEqual(r.status, 0);
  const out = (r.stdout || '') + (r.stderr || '');
  assert.match(out, /keystore|ANDROID_KEYSTORE|GOOGLE_WEB_CLIENT_ID|ANDROID_UPLOAD_CERT_SHA256/i);
});

test('android:aab release mode fails closed when ANDROID_UPLOAD_CERT_SHA256 is missing', () => {
  const ks = makeTempKeystore();
  const r = runAssert(releaseSecrets(ks, { ANDROID_UPLOAD_CERT_SHA256: '' }));
  assert.notEqual(r.status, 0);
  assert.match(`${r.stdout || ''}${r.stderr || ''}`, /ANDROID_UPLOAD_CERT_SHA256 required/);
});

test('android:aab release mode fails closed when upload cert SHA-256 mismatches', () => {
  const ks = makeTempKeystore();
  const r = runAssert(
    releaseSecrets(ks, {
      ANDROID_UPLOAD_CERT_SHA256: 'AA'.repeat(32),
    })
  );
  assert.notEqual(r.status, 0);
  assert.match(`${r.stdout || ''}${r.stderr || ''}`, /keystore fingerprint mismatch/);
});

test('android:aab release mode passes when upload cert SHA-256 matches', () => {
  const ks = makeTempKeystore();
  const r = runAssert(releaseSecrets(ks, { ANDROID_UPLOAD_CERT_SHA256: ks.sha256 }));
  assert.equal(r.status, 0, `${r.stdout || ''}${r.stderr || ''}`);
});

test('android:aab:dev still allows the separate dev-keystore path without upload cert', () => {
  const r = spawnSync(process.execPath, [script], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      ANDROID_AAB_ALLOW_DEV_KEYSTORE: '1',
      ANDROID_UPLOAD_CERT_SHA256: '',
    },
  });
  assert.equal(r.status, 0, `${r.stdout || ''}${r.stderr || ''}`);
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
