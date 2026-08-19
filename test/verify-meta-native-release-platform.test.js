'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'verify-meta-native-release.mjs');
const ANDROID_ROOT = path.join(ROOT, 'android');
const ANDROID_STRINGS = path.join(
  ROOT,
  'android',
  'app',
  'src',
  'main',
  'res',
  'values',
  'strings.xml'
);
const ANDROID_MANIFEST = path.join(ROOT, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

const VALID_TOKEN = '12345678901234567890';

function runVerify(args = [], env = {}) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

function writeAndroidFixture({ clientToken = VALID_TOKEN, appId = '27941105858861495' } = {}) {
  fs.mkdirSync(path.dirname(ANDROID_STRINGS), { recursive: true });
  fs.mkdirSync(path.dirname(ANDROID_MANIFEST), { recursive: true });
  fs.writeFileSync(
    ANDROID_STRINGS,
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <string name="facebook_app_id">${appId}</string>
  <string name="facebook_client_token">${clientToken}</string>
</resources>
`
  );
  fs.writeFileSync(
    ANDROID_MANIFEST,
    `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application>
    <meta-data android:name="com.facebook.sdk.AutoLogAppEventsEnabled" android:value="false" />
    <meta-data android:name="com.facebook.sdk.AdvertiserIDCollectionEnabled" android:value="false" />
  </application>
</manifest>
`
  );
}

function removeAndroidTree() {
  fs.rmSync(ANDROID_ROOT, { recursive: true, force: true });
}

describe('verify-meta-native-release platform scoping', () => {
  after(() => {
    removeAndroidTree();
  });

  it('--ios succeeds without android/ and without META_CLIENT_TOKEN', () => {
    removeAndroidTree();
    assert.equal(fs.existsSync(ANDROID_ROOT), false);
    const r = runVerify(['--ios'], { META_CLIENT_TOKEN: '' });
    if (r.status !== 0) {
      throw new Error((r.stdout || '') + (r.stderr || ''));
    }
    assert.match(r.stdout, /Platform: iOS/);
    assert.doesNotMatch(r.stdout, /Platform: Android/);
    assert.doesNotMatch(r.stderr || r.stdout, /strings\.xml not found/);
    assert.doesNotMatch(r.stderr + r.stdout, /FacebookClientToken/);
  });

  it('--android does not require iOS Meta native checks', () => {
    writeAndroidFixture();
    const r = runVerify(['--android']);
    if (r.status !== 0) {
      throw new Error((r.stdout || '') + (r.stderr || ''));
    }
    assert.match(r.stdout, /Platform: Android/);
    assert.doesNotMatch(r.stdout, /no-Meta-native gates verified/);
  });

  it('--android fails for missing or invalid facebook_client_token', () => {
    writeAndroidFixture({ clientToken: 'short' });
    const r = runVerify(['--android']);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /facebook_client_token/);
  });

  it('no platform flag still verifies both (fails when android/ missing)', () => {
    removeAndroidTree();
    const r = runVerify([]);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /strings\.xml|Android/);
  });

  it('unknown arguments fail closed with usage', () => {
    const r = runVerify(['--not-a-flag']);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /Unknown argument/);
    assert.match(r.stderr, /--ios/);
  });

  it('canonical release scripts use platform-scoped meta verify', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.match(
      pkg.scripts['cap:sync:android'],
      /verify-meta-native-release\.mjs --android/
    );
    const prep = fs.readFileSync(path.join(ROOT, 'scripts/ios-release-prepare.mjs'), 'utf8');
    assert.match(prep, /verify-meta-native-release\.mjs --ios/);
    assert.doesNotMatch(prep, /requires META_CLIENT_TOKEN/);
    assert.doesNotMatch(prep, /if \(!process\.env\.META_CLIENT_TOKEN/);
  });
});
