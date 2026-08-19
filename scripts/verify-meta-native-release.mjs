#!/usr/bin/env node
/**
 * Pre-upload gate for Meta App Events native release.
 * iOS 1.4: verifies NO Meta native SDK (Android still requires Meta token + SDK).
 *
 * Usage:
 *   node scripts/verify-meta-native-release.mjs           # both platforms (default)
 *   node scripts/verify-meta-native-release.mjs --ios   # iOS no-Meta-native gates
 *   node scripts/verify-meta-native-release.mjs --android # Android Meta gates
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const USAGE = `Usage: node scripts/verify-meta-native-release.mjs [--ios] [--android]

  --ios      Verify iOS NO-TRACKING gates (no Meta native SDK in shipped app)
  --android  Verify Android Meta/privacy gates only
  (no flags) Verify both platforms (backward compatible)

Unknown arguments are rejected (fail-closed).`;

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

let failed = false;

function fail(msg) {
  console.error(`[verify-meta-native-release] FAIL: ${msg}`);
  failed = true;
}

function ok(msg) {
  console.log(`[verify-meta-native-release] OK: ${msg}`);
}

function parsePlatformFlags(argv) {
  let verifyIos = false;
  let verifyAndroid = false;
  for (const arg of argv) {
    if (arg === '--ios') {
      verifyIos = true;
    } else if (arg === '--android') {
      verifyAndroid = true;
    } else {
      console.error(`[verify-meta-native-release] Unknown argument: ${arg}\n\n${USAGE}`);
      process.exit(1);
    }
  }
  if (!verifyIos && !verifyAndroid) {
    verifyIos = true;
    verifyAndroid = true;
  }
  return { verifyIos, verifyAndroid };
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

function checkAndroidPrivacyDefaults() {
  if (!fs.existsSync(ANDROID_MANIFEST)) {
    fail('AndroidManifest.xml missing — run cap:sync:android');
    return;
  }
  const manifest = fs.readFileSync(ANDROID_MANIFEST, 'utf8');
  if (
    !manifest.includes('com.facebook.sdk.AutoLogAppEventsEnabled') ||
    !/AutoLogAppEventsEnabled" android:value="false"/.test(manifest)
  ) {
    fail('Android AutoLogAppEventsEnabled is not false in manifest');
  } else {
    ok('Android AutoLog default false in AndroidManifest.xml');
  }
  if (
    !manifest.includes('com.facebook.sdk.AdvertiserIDCollectionEnabled') ||
    !/AdvertiserIDCollectionEnabled" android:value="false"/.test(manifest)
  ) {
    fail('Android AdvertiserIDCollectionEnabled is not false in manifest');
  } else {
    ok('Android AdvertiserID default false in AndroidManifest.xml');
  }
}

function verifyFacebookPrivacyPatch() {
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
}

function verifyIosGates() {
  console.log('[verify-meta-native-release] Platform: iOS (NO Meta native SDK)');

  const noAtt = spawnSync(
    process.execPath,
    [path.join(ROOT, 'scripts', 'verify-ios-no-att-meta-release.mjs')],
    { cwd: ROOT, encoding: 'utf8' }
  );
  if (noAtt.status !== 0) {
    fail('iOS no-ATT / no-Meta-native release verification failed');
    if (noAtt.stderr) process.stderr.write(noAtt.stderr);
    if (noAtt.stdout) process.stdout.write(noAtt.stdout);
  } else {
    ok('iOS no-ATT / no-Meta-native / SKAdNetwork gates verified');
  }
}

function verifyAndroidGates() {
  console.log('[verify-meta-native-release] Platform: Android');

  const androidToken = readAndroidString(ANDROID_STRINGS, 'facebook_client_token');
  secretPresent('Android facebook_client_token', androidToken);

  const androidAppId = readAndroidString(ANDROID_STRINGS, 'facebook_app_id');
  if (androidAppId !== '27941105858861495') {
    fail(`Android facebook_app_id unexpected: ${androidAppId || '(empty)'}`);
  } else {
    ok('Android facebook_app_id matches');
  }

  checkAndroidPrivacyDefaults();
}

const { verifyIos, verifyAndroid } = parsePlatformFlags(process.argv.slice(2));

verifyFacebookPrivacyPatch();

if (verifyIos) {
  verifyIosGates();
}
if (verifyAndroid) {
  verifyAndroidGates();
}

console.log('');
if (failed) {
  console.error('[verify-meta-native-release] STOP — fix issues before Archive / Play upload.');
  process.exit(1);
}

const scope =
  verifyIos && verifyAndroid ? 'iOS + Android' : verifyIos ? 'iOS' : 'Android';
console.log(
  `[verify-meta-native-release] All gates passed (${scope}). Proceed to device smoke, then store upload.`
);
if (verifyIos) {
  console.log('[verify-meta-native-release] iOS 1.4: Meta native SDK must stay absent from archive.');
}
if (verifyAndroid) {
  console.log('[verify-meta-native-release] Meta Dashboard: keep IAP/subscription/trial auto-log OFF.');
}
process.exit(0);
