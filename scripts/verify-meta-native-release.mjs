#!/usr/bin/env node
/**
 * Pre-upload gate for Meta App Events native release.
 * Confirms privacy patch + client token presence WITHOUT printing secret values.
 *
 * Usage (after cap:sync with META_CLIENT_TOKEN set):
 *   node scripts/verify-meta-native-release.mjs
 *
 * Exit 0 = safe to proceed to Archive / AAB upload.
 * Exit 1 = STOP — do not ship.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const IOS_PLIST = path.join(ROOT, 'ios', 'App', 'App', 'Info.plist');
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
const APP_DELEGATE = path.join(ROOT, 'ios', 'App', 'App', 'AppDelegate.swift');

let failed = false;

function fail(msg) {
  console.error(`[verify-meta-native-release] FAIL: ${msg}`);
  failed = true;
}

function ok(msg) {
  console.log(`[verify-meta-native-release] OK: ${msg}`);
}

function secretPresent(label, value) {
  const trimmed = String(value || '').trim();
  if (!trimmed || trimmed.length < 8) {
    fail(`${label} missing or too short — re-run cap:sync with META_CLIENT_TOKEN set`);
    return false;
  }
  ok(`${label} present (length ${trimmed.length}, value redacted)`);
  return true;
}

function readPlistString(plistPath, key) {
  if (!fs.existsSync(plistPath)) {
    fail(`Info.plist not found at ${path.relative(ROOT, plistPath)}`);
    return '';
  }
  const r = spawnSync(
    'plutil',
    ['-extract', key, 'raw', '-o', '-', plistPath],
    { encoding: 'utf8' }
  );
  if (r.status === 0 && r.stdout) {
    return r.stdout.trim();
  }
  // Fallback: regex parse (no plutil on some CI)
  const xml = fs.readFileSync(plistPath, 'utf8');
  const re = new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`);
  const m = xml.match(re);
  return m ? m[1].trim() : '';
}

function readAndroidString(stringsPath, name) {
  if (!fs.existsSync(stringsPath)) {
    fail(`strings.xml not found — run npm run cap:sync:android`);
    return '';
  }
  const xml = fs.readFileSync(stringsPath, 'utf8');
  const re = new RegExp(`<string name="${name}">([^<]*)</string>`);
  const m = xml.match(re);
  return m ? m[1].trim() : '';
}

function checkPrivacyDefaults() {
  if (!fs.existsSync(IOS_PLIST)) {
    fail('iOS project missing');
    return;
  }
  const plist = fs.readFileSync(IOS_PLIST, 'utf8');
  if (!/FacebookAutoLogAppEventsEnabled<\/key>\s*<false\/>/.test(plist)) {
    fail('iOS FacebookAutoLogAppEventsEnabled is not false');
  } else {
    ok('iOS AutoLog default false in Info.plist');
  }
  if (!/FacebookAdvertiserIDCollectionEnabled<\/key>\s*<false\/>/.test(plist)) {
    fail('iOS FacebookAdvertiserIDCollectionEnabled is not false');
  } else {
    ok('iOS AdvertiserID default false in Info.plist');
  }

  if (fs.existsSync(ANDROID_MANIFEST)) {
    const manifest = fs.readFileSync(ANDROID_MANIFEST, 'utf8');
    if (!manifest.includes('com.facebook.sdk.AutoLogAppEventsEnabled') ||
        !/AutoLogAppEventsEnabled" android:value="false"/.test(manifest)) {
      fail('Android AutoLogAppEventsEnabled is not false in manifest');
    } else {
      ok('Android AutoLog default false in AndroidManifest.xml');
    }
    if (!manifest.includes('com.facebook.sdk.AdvertiserIDCollectionEnabled') ||
        !/AdvertiserIDCollectionEnabled" android:value="false"/.test(manifest)) {
      fail('Android AdvertiserIDCollectionEnabled is not false in manifest');
    } else {
      ok('Android AdvertiserID default false in AndroidManifest.xml');
    }
  } else {
    fail('AndroidManifest.xml missing — run cap:sync:android');
  }

    if (fs.existsSync(APP_DELEGATE)) {
    const delegate = fs.readFileSync(APP_DELEGATE, 'utf8');
    const coordinatorPath = path.join(ROOT, 'ios', 'App', 'App', 'AttTrackingCoordinator.swift');
    if (!delegate.includes('AttTrackingCoordinator.shared')) {
      fail('AppDelegate missing AttTrackingCoordinator integration');
    } else {
      ok('AppDelegate uses AttTrackingCoordinator');
    }
    if (!fs.existsSync(coordinatorPath)) {
      fail('AttTrackingCoordinator.swift missing from iOS target');
    } else {
      ok('AttTrackingCoordinator.swift present');
    }
    const plistContent = fs.readFileSync(IOS_PLIST, 'utf8');
    if (plistContent.includes('NSUserTrackingUsageDescription')) {
      fail('Info.plist must not declare NSUserTrackingUsageDescription (no cross-app tracking)');
    } else {
      ok('Info.plist has no ATT usage description');
    }
    // Match method declarations only — Capacitor boilerplate comments mention applicationWillTerminate earlier.
    const becomeActive = delegate.slice(
      delegate.indexOf('func applicationDidBecomeActive'),
      delegate.indexOf('func applicationWillTerminate')
    );
    if (!becomeActive.includes('isAutoLogAppEventsEnabled')) {
      fail('AppDelegate activateApp not gated by isAutoLogAppEventsEnabled');
    } else {
      ok('AppDelegate activateApp gated by consent');
    }
  }
}

// 1) No ATT / SKAdNetwork / Meta privacy (iOS)
const noAtt = spawnSync(
  process.execPath,
  [path.join(ROOT, 'scripts', 'verify-ios-no-att-meta-release.mjs')],
  { cwd: ROOT, encoding: 'utf8' }
);
if (noAtt.status !== 0) {
  fail('iOS no-ATT / SKAdNetwork release verification failed');
  if (noAtt.stderr) process.stderr.write(noAtt.stderr);
  if (noAtt.stdout) process.stdout.write(noAtt.stdout);
} else {
  ok('iOS no-ATT / SKAdNetwork gates verified');
}

// 2) Plugin privacy patch
const privacy = spawnSync(
  process.execPath,
  [path.join(ROOT, 'scripts', 'verify-capacitor-facebook-events-privacy.mjs')],
  { cwd: ROOT, encoding: 'utf8' }
);
if (privacy.status !== 0) {
  fail('capacitor-facebook-events privacy patch verification failed');
  if (privacy.stderr) process.stderr.write(privacy.stderr);
  if (privacy.stdout) process.stdout.write(privacy.stdout);
} else {
  ok('Facebook plugin privacy patch verified');
}

// 3) Client token in native resources (never print value)
const iosToken = readPlistString(IOS_PLIST, 'FacebookClientToken');
secretPresent('iOS FacebookClientToken', iosToken);

const androidToken = readAndroidString(ANDROID_STRINGS, 'facebook_client_token');
secretPresent('Android facebook_client_token', androidToken);

// 4) Public App ID sanity
const iosAppId = readPlistString(IOS_PLIST, 'FacebookAppID');
if (iosAppId !== '27941105858861495') {
  fail(`iOS FacebookAppID unexpected: ${iosAppId || '(empty)'}`);
} else {
  ok('iOS FacebookAppID matches');
}

const androidAppId = readAndroidString(ANDROID_STRINGS, 'facebook_app_id');
if (androidAppId !== '27941105858861495') {
  fail(`Android facebook_app_id unexpected: ${androidAppId || '(empty)'}`);
} else {
  ok('Android facebook_app_id matches');
}

// 5) Privacy defaults
checkPrivacyDefaults();

console.log('');
if (failed) {
  console.error('[verify-meta-native-release] STOP — fix issues before Archive / Play upload.');
  process.exit(1);
}

console.log('[verify-meta-native-release] All gates passed. Proceed to device smoke, then store upload.');
console.log('[verify-meta-native-release] Meta Dashboard: keep IAP/subscription/trial auto-log OFF.');
process.exit(0);
