'use strict';

const { describe, it, after } = require('node:test');
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

function runVerify(args = [], env = {}) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

function writeCleanAndroidFixture() {
  fs.mkdirSync(path.dirname(ANDROID_STRINGS), { recursive: true });
  fs.mkdirSync(path.dirname(ANDROID_MANIFEST), { recursive: true });
  fs.writeFileSync(
    ANDROID_STRINGS,
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <string name="app_name">My Starday</string>
</resources>
`
  );
  fs.writeFileSync(
    ANDROID_MANIFEST,
    `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application>
  </application>
</manifest>
`
  );
}

function writeMetaRegressionAndroidFixture() {
  fs.mkdirSync(path.dirname(ANDROID_STRINGS), { recursive: true });
  fs.mkdirSync(path.dirname(ANDROID_MANIFEST), { recursive: true });
  fs.writeFileSync(
    ANDROID_STRINGS,
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <string name="facebook_app_id">27941105858861495</string>
  <string name="facebook_client_token">12345678901234567890</string>
</resources>
`
  );
  fs.writeFileSync(
    ANDROID_MANIFEST,
    `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application>
    <meta-data android:name="com.facebook.sdk.ApplicationId" android:value="@string/facebook_app_id" />
    <meta-data android:name="com.facebook.sdk.AutoLogAppEventsEnabled" android:value="false" />
  </application>
</manifest>
`
  );
}

function removeAndroidTree() {
  fs.rmSync(ANDROID_ROOT, { recursive: true, force: true });
}

describe('verify-meta-native-release platform scoping (NO-META-native gate)', () => {
  after(() => {
    removeAndroidTree();
  });

  it('--ios succeeds without android/', () => {
    removeAndroidTree();
    assert.equal(fs.existsSync(ANDROID_ROOT), false);
    const r = runVerify(['--ios']);
    if (r.status !== 0) {
      throw new Error((r.stdout || '') + (r.stderr || ''));
    }
    assert.match(r.stdout, /Platform: iOS/);
    assert.doesNotMatch(r.stdout, /Platform: Android/);
  });

  it('--android succeeds when android/ has not been generated (nothing to find)', () => {
    removeAndroidTree();
    const r = runVerify(['--android']);
    if (r.status !== 0) {
      throw new Error((r.stdout || '') + (r.stderr || ''));
    }
    assert.match(r.stdout, /Platform: Android/);
    assert.match(r.stdout, /not generated yet/);
  });

  it('--android succeeds on a clean (Meta-free) generated project', () => {
    writeCleanAndroidFixture();
    const r = runVerify(['--android']);
    if (r.status !== 0) {
      throw new Error((r.stdout || '') + (r.stderr || ''));
    }
    assert.match(r.stdout, /has no Meta native SDK meta-data entries/);
    assert.match(r.stdout, /has no Meta native SDK strings/);
  });

  it('--android FAILS if Meta App ID / client token / manifest metadata regress back in', () => {
    writeMetaRegressionAndroidFixture();
    const r = runVerify(['--android']);
    assert.notEqual(r.status, 0);
    const out = r.stderr + r.stdout;
    assert.match(out, /facebook_app_id/);
    assert.match(out, /facebook_client_token/);
    assert.match(out, /com\.facebook\.sdk\.ApplicationId/);
  });

  it('--android FAILS if capacitor-facebook-events regresses back into includePlugins', () => {
    removeAndroidTree();
    const capTsPath = path.join(ROOT, 'capacitor.config.ts');
    const original = fs.readFileSync(capTsPath, 'utf8');
    const poisoned = original.replace(
      /android:\s*\{[\s\S]*?includePlugins:\s*\[/,
      (m) => `${m}\n      'capacitor-facebook-events',`
    );
    assert.notEqual(poisoned, original, 'fixture must actually inject the plugin');
    fs.writeFileSync(capTsPath, poisoned);
    try {
      const r = runVerify(['--android']);
      assert.notEqual(r.status, 0);
      assert.match(r.stderr + r.stdout, /still includes capacitor-facebook-events in Android includePlugins/);
    } finally {
      fs.writeFileSync(capTsPath, original);
    }
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
    assert.doesNotMatch(pkg.scripts['cap:sync:android'], /patch-android-facebook-sdk\.mjs/);
    assert.doesNotMatch(pkg.scripts['cap:sync:android'], /patch-capacitor-facebook-events-privacy\.mjs/);
    const prep = fs.readFileSync(path.join(ROOT, 'scripts/ios-release-prepare.mjs'), 'utf8');
    assert.match(prep, /verify-meta-native-release\.mjs --ios/);
    assert.doesNotMatch(prep, /requires META_CLIENT_TOKEN/);
    assert.doesNotMatch(prep, /if \(!process\.env\.META_CLIENT_TOKEN/);
  });
});
