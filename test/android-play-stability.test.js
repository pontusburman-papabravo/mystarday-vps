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

  it('platform-native.css keeps login magic-input dark-theme on Android', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/css/platform-native.css'), 'utf8');
    assert.match(src, /login-magic-bg \.magic-form-fields \.magic-input/);
    assert.match(src, /color: #fff !important/);
    assert.doesNotMatch(src, /magic-form-fields \.magic-input,\s*\nhtml\.is-native-android #ppin-overlay/);
    assert.match(src, /\.magic-3d-orbs/);
  });

  it('parent-magic-shell skips 3D orbs on Android native', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-shell.js'), 'utf8');
    assert.match(src, /isAndroidNative/);
    assert.match(src, /if \(isAndroidNative\(\)\) return/);
    assert.match(src, /is-native-android/);
  });

  it('platform-native.css flattens parent-magic 3D on Android', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/css/platform-native.css'), 'utf8');
    assert.match(src, /parent-magic-view \.magic-3d-scene/);
    assert.match(src, /transform-style: flat !important/);
    assert.match(src, /parent-ready-child:active/);
  });

  it('dashboard-home-hub skips magic-3d-scene on Android', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/dashboard-home-hub.js'), 'utf8');
    assert.match(src, /isAndroidFlatMode/);
    assert.match(src, /is-native-android/);
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
    assert.match(pkg.scripts['cap:sync:android'], /patch-android-main-activity\.mjs/);
  });

  it('android-version.json bumped for Play resubmission', () => {
    const versions = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/play-store/android-version.json'), 'utf8'));
    assert.ok(versions.versionCode >= 5);
  });

  it('platform-html ensures native-debug assets even when already injected', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/middleware/platform-html.js'), 'utf8');
    assert.match(src, /ensureNativeDebugAssets/);
    assert.match(src, /INJECT_MARKER\)\) \{[\s\S]*ensureNativeDebugAssets/);
  });

  it('native-debug overlay script and WebView debugging patch exist', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/native-debug.js'), 'utf8');
    assert.match(js, /native_debug/);
    assert.match(js, /nativeDebugPanel/);
    assert.doesNotMatch(js, /location\.assign\s*=/, 'must not patch read-only location.assign (Android WebView crash)');
    const html = fs.readFileSync(path.join(ROOT, 'src/middleware/platform-html.js'), 'utf8');
    assert.match(html, /native-debug\.js/);
    const patch = fs.readFileSync(path.join(ROOT, 'scripts/patch-android-main-activity.mjs'), 'utf8');
    assert.match(patch, /setWebContentsDebuggingEnabled\(true\)/);
  });

  it('login skips auto-redirect to dashboard on Android native (GPU crash loop)', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/login.html'), 'utf8');
    assert.match(html, /androidStayOnLogin/);
    assert.match(html, /AppEntry\.init must run|fall through[\s\S]*AppEntry\.init/);
  });

  it('app-entry shows role pick for logged-in Android native', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/app-entry.js'), 'utf8');
    assert.match(js, /ENTRY_ROLE_PICK/);
    assert.match(js, /is-native-android[\s\S]*Auth\.isLoggedIn/);
  });

  it('platform-native flat mode covers parent-magic-dashboard', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/platform-native.css'), 'utf8');
    assert.match(css, /body\.parent-magic-dashboard/);
  });

  it('patch-android-version.mjs is idempotent when build.gradle already matches', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts/patch-android-version.mjs'), 'utf8');
    assert.match(src, /already at versionCode/);
  });
});
