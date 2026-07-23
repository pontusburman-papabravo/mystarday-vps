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

  it('platform-html gates native-debug behind NATIVE_DEBUG_OVERLAY', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/middleware/platform-html.js'), 'utf8');
    assert.match(src, /shouldInjectNativeDebug/);
    assert.match(src, /NATIVE_DEBUG_OVERLAY/);
    const { injectPlatformHtml, shouldInjectNativeDebug } = require('../src/middleware/platform-html');
    const html = '<!DOCTYPE html><html><head></head><body></body></html>';
    const prev = process.env.NATIVE_DEBUG_OVERLAY;
    try {
      delete process.env.NATIVE_DEBUG_OVERLAY;
      assert.equal(shouldInjectNativeDebug(null), false);
      assert.doesNotMatch(injectPlatformHtml(html, '/login', null), /native-debug\.js/);
      process.env.NATIVE_DEBUG_OVERLAY = 'true';
      assert.equal(shouldInjectNativeDebug(null), true);
      assert.match(injectPlatformHtml(html, '/login', null), /native-debug\.js/);
    } finally {
      if (prev === undefined) delete process.env.NATIVE_DEBUG_OVERLAY;
      else process.env.NATIVE_DEBUG_OVERLAY = prev;
    }
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

  it('login Google button uses branded markup (logo + label span for loading state)', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/login.html'), 'utf8');
    assert.match(html, /id="googleLoginBtn"[^>]*class="google-btn-magic"/);
    assert.match(html, /google-btn-magic__icon/);
    assert.match(html, /google-btn-magic__label/);
    const js = fs.readFileSync(path.join(ROOT, 'public/js/google-auth-ui.js'), 'utf8');
    assert.match(js, /google-btn-magic__label/);
    assert.match(js, /setGoogleBtnLoading/);
  });

  it('app-view-mode enables parent magic flat on Android native', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/app-view-mode.js'), 'utf8');
    assert.match(js, /isAndroidNative/);
    assert.match(js, /parentMagicEnabled/);
    assert.doesNotMatch(js, /isAndroidNative\(\)\) return false/);
    assert.match(js, /_mode = 'magic'/);
  });

  it('server strips GPU CSS for Android WebView user-agent', () => {
    const {
      injectPlatformHtml,
      stripAndroidGpuHtml,
      isAndroidPlayReviewSafeMode,
      isAndroidWebViewRequest,
      isAndroidDashboardPath,
    } = require('../src/middleware/platform-html');
    const html = '<!DOCTYPE html><html><head><link rel="stylesheet" href="/css/parent-magic-3d.css?v=1"><link rel="stylesheet" href="/css/parent-magic-common.css?v=1"><link rel="stylesheet" href="/css/theme.css?v=1"><script src="/js/parent-magic-shell.js?v=1"><\/script></head><body></body></html>';
    assert.doesNotMatch(stripAndroidGpuHtml(html), /parent-magic-3d/);
    assert.match(stripAndroidGpuHtml(html), /parent-magic-common/);
    assert.match(stripAndroidGpuHtml(html), /theme\.css/);

    const wvReq = { get: function (h) {
      if (h === 'user-agent') return 'Mozilla/5.0 (Linux; Android 16; wv) AppleWebKit/537.36';
      return '';
    }, query: {} };
    assert.equal(isAndroidWebViewRequest(wvReq), true);
    assert.equal(isAndroidDashboardPath('/dashboard'), true);
    assert.equal(isAndroidDashboardPath('/parent'), true);
    assert.equal(isAndroidDashboardPath('/'), true);
    assert.equal(isAndroidPlayReviewSafeMode(wvReq, '/dashboard'), true);

    const chromeReq = { get: function (h) {
      if (h === 'user-agent') return 'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.0.0 Mobile Safari/537.36';
      return '';
    }, query: {} };
    assert.equal(isAndroidWebViewRequest(chromeReq), true);

    const appReq = { get: function (h) {
      if (h === 'user-agent') return 'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36';
      if (h === 'x-requested-with') return 'app.' + 'mys' + 'tar' + 'day' + '.native';
      return '';
    }, query: {} };
    assert.equal(isAndroidWebViewRequest(appReq), true);

    const out = injectPlatformHtml(html, '/dashboard', wvReq);
    assert.doesNotMatch(out, /parent-magic-3d\.css/);
    assert.match(out, /parent-magic-common\.css|parent-magic-shell/);
    assert.match(out, /parent-magic-early-boot/);
    assert.doesNotMatch(out, /journey-celebration/);
    assert.match(out, /android-webview-hardening-beacon/);
    assert.match(out, /android_webview_hardening_applied/);
    assert.match(out, /__ANDROID_PLAY_REVIEW_SAFE_MODE__/);
  });

  it('parent-magic-bootstrap boots on Android native', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-bootstrap.js'), 'utf8');
    assert.doesNotMatch(js, /is-native-android[\s\S]*return;/);
    assert.match(js, /ParentMagicShell\.init/);
  });

  it('dashboard uses ParentMagicShell on Android native', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/dashboard.js'), 'utf8');
    assert.match(js, /androidFlat[\s\S]*ParentMagicShell\.init/);
  });

  it('ANDROID_PLAY_REVIEW_SAFE_MODE keeps schedule-core.js', () => {
    const { injectPlatformHtml } = require('../src/middleware/platform-html');
    const html = '<!DOCTYPE html><html><head></head><body><script src="/js/schedule-core.js?v=1"><\/script><script src="/js/dashboard.js?v=1"><\/script></body></html>';
    const req = { get: function (h) { return h === 'user-agent' ? 'Mozilla/5.0 (Linux; Android 16; wv) AppleWebKit/537.36' : ''; }, query: {} };
    const out = injectPlatformHtml(html, '/dashboard', req);
    assert.match(out, /schedule-core\.js/);
    assert.doesNotMatch(out, /sortablejs/);
  });

  it('ANDROID_PLAY_REVIEW_SAFE_MODE keeps magic shell + home hub', () => {
    const { injectPlatformHtml } = require('../src/middleware/platform-html');
    const html = '<!DOCTYPE html><html><head><link rel="stylesheet" href="/css/app-view-toggle.css?v=10"></head><body>' +
      '<script src="/js/parent-magic-auto.js?v=10"><\/script>' +
      '<script src="/js/dashboard-home-hub.js?v=6"><\/script>' +
      '<script src="/js/dashboard-activity-modal.js?v=2"><\/script>' +
      '<script src="/js/dnd-touch-bridge.js?v=1"><\/script>' +
      '<script src="/js/birthday-picker.js?v=2"><\/script>' +
      '<script src="/js/parent-magic-shell.js?v=1"><\/script></body></html>';
    const req = { get: function (h) { return h === 'user-agent' ? 'Mozilla/5.0 (Linux; Android 16; wv) AppleWebKit/537.36' : ''; }, query: {} };
    const out = injectPlatformHtml(html, '/dashboard', req);
    assert.match(out, /app-view-toggle\.css/);
    assert.match(out, /parent-magic-auto\.js/);
    assert.match(out, /dashboard-home-hub\.js/);
    assert.match(out, /dashboard-activity-modal\.js/);
    assert.match(out, /parent-magic-shell\.js/);
    assert.doesNotMatch(out, /sortablejs/);
  });

  it('dashboard guards optional init on Android safe mode', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/dashboard.js'), 'utf8');
    assert.match(js, /typeof initBirthdayPicker === 'function'/);
    assert.match(js, /typeof bindRecurrenceAddHandlers === 'function'/);
    assert.match(js, /dashboard_csrf_ready/);
    assert.match(js, /dashboard_data_fetch_start/);
  });

  it('Android initParent skips duplicate auth/me fetch', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/app-view-mode.js'), 'utf8');
    assert.match(js, /isAndroidNative\(\)[\s\S]*finishInitParent/);
    assert.match(js, /skip duplicate round-trip/);
  });

  it('parent-magic-auto boots classic chrome on Android', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-auto.js'), 'utf8');
    assert.match(js, /bootClassicChrome/);
    assert.match(js, /__ANDROID_PLAY_REVIEW_SAFE_MODE__/);
  });

  it('dashboard-activity-modal guards missing ScheduleCore', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/dashboard-activity-modal.js'), 'utf8');
    assert.match(js, /window\.ScheduleCore \|\| \{\}/);
  });

  it('apiFetch skips silentRefresh on Android GET', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/auth.js'), 'utf8');
    assert.match(js, /is-native-android[\s\S]*!isMutation[\s\S]*fetch\(url/);
  });

  it('Android GPU strip does not use MutationObserver', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/middleware/platform-html.js'), 'utf8');
    assert.doesNotMatch(src, /MutationObserver\(_stripGpuCss\)/);
    assert.match(src, /_stripGpuCss/);
  });

  it('feature-check skips MutationObserver on Android', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/feature-check.js'), 'utf8');
    assert.match(js, /is-native-android[\s\S]*observeNewElements/);
  });

  it('authGuard uses lightweight fetch on Android native', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/auth.js'), 'utf8');
    assert.match(js, /is-native-android[\s\S]*auth_me_fetch_start/);
    assert.match(js, /fetch\('\/api\/auth\/me'/);
    assert.match(js, /auth_me_json_ok/);
  });

  it('dashboard.js does not shadow window.androidStabilityLog (stack overflow guard)', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/dashboard.js'), 'utf8');
    assert.doesNotMatch(js, /function\s+androidStabilityLog\s*\(/);
    assert.doesNotMatch(js, /window\.androidStabilityLog\s*\(/);
    assert.match(js, /_injectedAndroidStabilityLog/);
    assert.match(js, /logDashboardStability/);
  });

  it('dashboard.js shared mutable state uses var (activity-modal assigns)', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/dashboard.js'), 'utf8');
    const mutable = [
      'selectedTemplateId',
      'addSectionOverride',
      'editSectionVal',
      'allTemplates',
      '_onceMode',
      '_pendingTargetChildIds',
    ];
    for (const name of mutable) {
      assert.doesNotMatch(js, new RegExp('const\\s+' + name + '\\s*='));
      assert.match(js, new RegExp('var\\s+' + name + '\\s*='));
    }
  });

  it('ANDROID_PLAY_REVIEW_SAFE_MODE documented in platform-html', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/middleware/platform-html.js'), 'utf8');
    assert.match(src, /ANDROID_PLAY_REVIEW_SAFE_MODE/);
    assert.match(src, /android_webview_hardening_applied/);
  });

  it('platform-html strips GPU css on Android boot', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/middleware/platform-html.js'), 'utf8');
    assert.match(src, /_stripGpuCss/);
    assert.match(src, /parent-magic-3d/);
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

  it('Android childCardsGrid override is scoped to non-magic dashboard', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/platform-native.css'), 'utf8');
    assert.match(css, /body:not\(\.parent-magic-dashboard\)\s+#childCardsGrid/);
    assert.doesNotMatch(css, /html\.is-native-android\s+#childCardsGrid\s*\{[^}]*display:\s*flex/);
  });

  it('dash-child-card contrast fix exists for magic dark on white cards', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/parent-magic-common.css'), 'utf8');
    assert.match(css, /\.dash-child-card/);
    assert.match(css, /dash-child-card[\s\S]*\.text-navy/);
  });

  it('patch-android-version.mjs is idempotent when build.gradle already matches', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts/patch-android-version.mjs'), 'utf8');
    assert.match(src, /already at versionCode/);
  });
});
