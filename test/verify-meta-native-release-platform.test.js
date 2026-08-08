'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'verify-meta-native-release.mjs');
const IOS_PLIST = path.join(ROOT, 'ios', 'App', 'App', 'Info.plist');
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
const TOKEN_KEY_BLOCK = `\t<key>FacebookClientToken</key>\n\t<string>${VALID_TOKEN}</string>\n`;

function runVerify(args = []) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

function injectIosClientToken(plistXml) {
  if (plistXml.includes('<key>FacebookClientToken</key>')) {
    return plistXml.replace(
      /<key>FacebookClientToken<\/key>\s*<string>[^<]*<\/string>/,
      `<key>FacebookClientToken</key>\n\t<string>${VALID_TOKEN}</string>`
    );
  }
  return plistXml.replace(
    /<key>FacebookAppID<\/key>\n\t<string>27941105858861495<\/string>/,
    `<key>FacebookAppID</key>\n\t<string>27941105858861495</string>\n${TOKEN_KEY_BLOCK.trimStart()}`
  );
}

function stripIosClientToken(plistXml) {
  return plistXml.replace(/\t<key>FacebookClientToken<\/key>\s*<string>[^<]*<\/string>\s*\n?/g, '');
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
  let originalPlist;

  before(() => {
    originalPlist = fs.readFileSync(IOS_PLIST, 'utf8');
  });

  after(() => {
    fs.writeFileSync(IOS_PLIST, originalPlist);
    removeAndroidTree();
  });

  it('--ios succeeds without android/ when iOS Meta state is valid', () => {
    removeAndroidTree();
    assert.equal(fs.existsSync(ANDROID_ROOT), false);
    fs.writeFileSync(IOS_PLIST, injectIosClientToken(originalPlist));
    const r = runVerify(['--ios']);
    if (r.status !== 0) {
      throw new Error((r.stdout || '') + (r.stderr || ''));
    }
    assert.match(r.stdout, /Platform: iOS/);
    assert.doesNotMatch(r.stdout, /Platform: Android/);
    assert.doesNotMatch(r.stderr || r.stdout, /strings\.xml not found/);
  });

  it('--ios fails when iOS FacebookClientToken is missing', () => {
    removeAndroidTree();
    fs.writeFileSync(IOS_PLIST, stripIosClientToken(originalPlist));
    const r = runVerify(['--ios']);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /FacebookClientToken/);
  });

  it('--android does not require generated iOS client token checks', () => {
    fs.writeFileSync(IOS_PLIST, stripIosClientToken(originalPlist));
    writeAndroidFixture();
    const r = runVerify(['--android']);
    if (r.status !== 0) {
      throw new Error((r.stdout || '') + (r.stderr || ''));
    }
    assert.match(r.stdout, /Platform: Android/);
    assert.doesNotMatch(r.stdout, /iOS no-ATT/);
  });

  it('--android fails for missing or invalid facebook_client_token', () => {
    writeAndroidFixture({ clientToken: 'short' });
    const r = runVerify(['--android']);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /facebook_client_token/);
  });

  it('no platform flag still verifies both (fails when android/ missing)', () => {
    removeAndroidTree();
    fs.writeFileSync(IOS_PLIST, injectIosClientToken(originalPlist));
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
  });
});
