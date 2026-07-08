'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('Android Play stability guards', () => {
  it('capacitor.config.ts excludes Apple Sign In from Android includePlugins', () => {
    const src = fs.readFileSync(path.join(ROOT, 'capacitor.config.ts'), 'utf8');
    assert.match(src, /android:\s*\{[\s\S]*includePlugins:/);
    const androidBlock = src.slice(src.indexOf('android:'));
    assert.doesNotMatch(androidBlock.slice(0, androidBlock.indexOf('},', androidBlock.indexOf('includePlugins'))), /apple-sign-in/);
    assert.match(androidBlock, /capacitor-google-auth/);
  });

  it('platform.js guards Google Sign In before native signIn()', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/platform.js'), 'utf8');
    assert.match(src, /Google Sign In är inte redo/);
    assert.match(src, /await GoogleAuth\.initialize/);
    assert.doesNotMatch(src, /await import\('@capacitor\/haptics'\)/);
  });

  it('platform-native.css disables backdrop-filter and filter blur on Android native', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/css/platform-native.css'), 'utf8');
    assert.match(src, /is-native-android/);
    assert.match(src, /backdrop-filter: none !important/);
    assert.match(src, /filter: none !important/);
    assert.match(src, /\.cloud/);
  });

  it('platform-html injects synchronous is-native-android boot before CSS', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/middleware/platform-html.js'), 'utf8');
    assert.match(src, /is-native-android/);
    assert.match(src, /getPlatform\(\)==="android"/);
    assert.doesNotMatch(src, /DOMContentLoaded.*is-native-android/);
  });

  it('platform.js applies native DOM classes synchronously', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/platform.js'), 'utf8');
    assert.match(src, /Synchronous — Android GPU guards/);
    assert.match(src, /run\(\)/);
  });

  it('prepare-android-native.mjs strips Apple Sign In package', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts/prepare-android-native.mjs'), 'utf8');
    assert.match(src, /apple-sign-in/);
  });

  it('patch-android-google-auth.mjs adds native null-guard', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts/patch-android-google-auth.mjs'), 'utf8');
    assert.match(src, /googleSignInClient == null/);
  });

  it('cap:sync:android runs verify-android-native.mjs', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.match(pkg.scripts['cap:sync:android'], /verify-android-native\.mjs/);
    assert.match(pkg.scripts['cap:sync:android'], /prepare-android-native\.mjs/);
  });

  it('android-version.json bumped for Play resubmission', () => {
    const versions = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/play-store/android-version.json'), 'utf8'));
    assert.ok(versions.versionCode >= 4);
  });

  it('patch-android-version.mjs is idempotent when build.gradle already matches', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts/patch-android-version.mjs'), 'utf8');
    assert.match(src, /already at versionCode/);
  });
});
