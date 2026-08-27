'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('R4.5 Android release hardening', () => {
  it('MainActivity patch enables WebView debugging only in DEBUG builds', () => {
    const patch = fs.readFileSync(path.join(ROOT, 'scripts/patch-android-main-activity.mjs'), 'utf8');
    assert.match(patch, /ApplicationInfo\.FLAG_DEBUGGABLE/);
    assert.match(
      patch,
      /getApplicationInfo\(\)\.flags & ApplicationInfo\.FLAG_DEBUGGABLE[\s\S]*setWebContentsDebuggingEnabled\(true\)/
    );
  });

  it('MainActivity patch must not reference BuildConfig (compile blocker in release AAB)', () => {
    const patch = fs.readFileSync(path.join(ROOT, 'scripts/patch-android-main-activity.mjs'), 'utf8');
    assert.doesNotMatch(patch, /BuildConfig/);
    const verify = fs.readFileSync(
      path.join(ROOT, 'scripts/verify-android-release-hardening.mjs'),
      'utf8'
    );
    assert.match(verify, /BuildConfig[\s\S]*fail|fail[\s\S]*BuildConfig/);
    assert.match(verify, /ApplicationInfo\.FLAG_DEBUGGABLE/);
  });

  it('Meta Android privacy patch never ties Advertising ID to marketing consent', () => {
    const java = fs.readFileSync(
      path.join(ROOT, 'scripts/android/FacebookEventsPlugin.java.patched'),
      'utf8'
    );
    assert.doesNotMatch(java, /setAdvertiserIDCollectionEnabled\s*\(\s*marketing\s*\)/);
    assert.doesNotMatch(java, /setAdvertiserIDCollectionEnabled\s*\(\s*advertiserAllowed\s*\)/);
    assert.match(java, /setAdvertiserIDCollectionEnabled\(false\)/);
  });

  it('cap:sync:android runs verify-android-release-hardening', () => {
    const pkg = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
    assert.match(pkg, /verify-android-release-hardening\.mjs/);
  });

  it('canonical Android versionCode is monotonic for R4.5 release', () => {
    const v = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/play-store/android-version.json'), 'utf8'));
    assert.ok(v.versionCode >= 12, 'versionCode must be > prior acceptance build 11 unless Play max is lower');
    assert.equal(v.versionName, '1.4.3');
  });
});
