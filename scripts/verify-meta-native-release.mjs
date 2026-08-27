#!/usr/bin/env node
/**
 * Pre-upload gate for Meta App Events native release.
 *
 * Both platforms currently ship with NO Meta native SDK — Meta App Events is
 * PAUSED for this release (see capacitor.config.ts comments). iOS never included
 * the plugin; Android now also excludes `capacitor-facebook-events` from
 * includePlugins, so this gate asserts ABSENCE of Meta SDK/resources/manifest
 * metadata on both platforms rather than requiring a client token.
 *
 * Usage:
 *   node scripts/verify-meta-native-release.mjs           # both platforms (default)
 *   node scripts/verify-meta-native-release.mjs --ios   # iOS no-Meta-native gates
 *   node scripts/verify-meta-native-release.mjs --android # Android no-Meta-native gates
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const USAGE = `Usage: node scripts/verify-meta-native-release.mjs [--ios] [--android]

  --ios      Verify iOS NO-TRACKING gates (no Meta native SDK in shipped app)
  --android  Verify Android NO-META-native gate (no Meta native SDK in shipped AAB)
  (no flags) Verify both platforms (backward compatible)

Unknown arguments are rejected (fail-closed).`;

const ANDROID_ROOT = path.join(ROOT, 'android');
const ANDROID_STRINGS = path.join(
  ANDROID_ROOT,
  'app',
  'src',
  'main',
  'res',
  'values',
  'strings.xml'
);
const ANDROID_MANIFEST = path.join(ANDROID_ROOT, 'app', 'src', 'main', 'AndroidManifest.xml');
const ANDROID_APP_BUILD_GRADLE = path.join(ANDROID_ROOT, 'app', 'build.gradle');
const ANDROID_CAPACITOR_SETTINGS = path.join(ANDROID_ROOT, 'capacitor.settings.gradle');

const FORBIDDEN_MANIFEST_META_DATA = [
  'com.facebook.sdk.ApplicationId',
  'com.facebook.sdk.ClientToken',
  'com.facebook.sdk.AutoInitEnabled',
  'com.facebook.sdk.AutoLogAppEventsEnabled',
  'com.facebook.sdk.AdvertiserIDCollectionEnabled',
];

const FORBIDDEN_STRING_NAMES = ['facebook_app_id', 'facebook_client_token', 'fb_login_protocol_scheme'];

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

function checkAndroidCapacitorConfigExcludesMeta() {
  const capTsPath = path.join(ROOT, 'capacitor.config.ts');
  if (!fs.existsSync(capTsPath)) {
    fail('capacitor.config.ts missing');
    return;
  }
  const capTs = fs.readFileSync(capTsPath, 'utf8');
  const androidBlock = capTs.match(/android:\s*\{[\s\S]*?includePlugins:\s*\[([\s\S]*?)\]/);
  const plugins = androidBlock ? androidBlock[1] : '';
  if (/['"]capacitor-facebook-events['"]/.test(plugins)) {
    fail('capacitor.config.ts still includes capacitor-facebook-events in Android includePlugins');
  } else {
    ok('capacitor.config.ts excludes capacitor-facebook-events from Android includePlugins');
  }
}

function checkAndroidManifestHasNoMeta() {
  if (!fs.existsSync(ANDROID_MANIFEST)) {
    ok('android/ not generated yet (run npm run cap:sync:android to fully verify) — no Meta manifest metadata possible');
    return;
  }
  const manifest = fs.readFileSync(ANDROID_MANIFEST, 'utf8');
  let clean = true;
  for (const key of FORBIDDEN_MANIFEST_META_DATA) {
    if (manifest.includes(key)) {
      fail(`AndroidManifest.xml still declares ${key} (Meta native SDK metadata)`);
      clean = false;
    }
  }
  if (clean) ok('AndroidManifest.xml has no Meta native SDK meta-data entries');
}

function checkAndroidStringsHaveNoMeta() {
  if (!fs.existsSync(ANDROID_STRINGS)) {
    ok('android/ not generated yet (run npm run cap:sync:android to fully verify) — no Meta strings possible');
    return;
  }
  const strings = fs.readFileSync(ANDROID_STRINGS, 'utf8');
  let clean = true;
  for (const name of FORBIDDEN_STRING_NAMES) {
    if (new RegExp(`<string name="${name}">`).test(strings)) {
      fail(`strings.xml still declares ${name} (Meta native SDK string)`);
      clean = false;
    }
  }
  if (clean) ok('strings.xml has no Meta native SDK strings');
}

function checkAndroidBuildHasNoFacebookSdk() {
  if (!fs.existsSync(ANDROID_APP_BUILD_GRADLE)) {
    ok('android/app/build.gradle not generated yet — no Facebook SDK dependency possible');
  } else {
    const gradle = fs.readFileSync(ANDROID_APP_BUILD_GRADLE, 'utf8');
    if (/com\.facebook\.android|facebook-android-sdk/i.test(gradle)) {
      fail('android/app/build.gradle references a Facebook/Meta native SDK dependency');
    } else {
      ok('android/app/build.gradle has no Facebook/Meta native SDK dependency');
    }
  }

  if (fs.existsSync(ANDROID_CAPACITOR_SETTINGS)) {
    const settings = fs.readFileSync(ANDROID_CAPACITOR_SETTINGS, 'utf8');
    if (/capacitor-facebook-events/i.test(settings)) {
      fail('android/capacitor.settings.gradle still includes the capacitor-facebook-events module');
    } else {
      ok('android/capacitor.settings.gradle excludes the capacitor-facebook-events module');
    }
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
  console.log('[verify-meta-native-release] Platform: Android (NO-META-native gate — Meta paused for this release)');
  checkAndroidCapacitorConfigExcludesMeta();
  checkAndroidManifestHasNoMeta();
  checkAndroidStringsHaveNoMeta();
  checkAndroidBuildHasNoFacebookSdk();
}

const { verifyIos, verifyAndroid } = parsePlatformFlags(process.argv.slice(2));

if (verifyIos) {
  verifyIosGates();
}
if (verifyAndroid) {
  verifyAndroidGates();
}

console.log('');
if (failed) {
  console.error('[verify-meta-native-release] STOP — Meta native SDK must stay out of the release. Fix before Archive / Play upload.');
  process.exit(1);
}

const scope =
  verifyIos && verifyAndroid ? 'iOS + Android' : verifyIos ? 'iOS' : 'Android';
console.log(
  `[verify-meta-native-release] All gates passed (${scope}). Meta native SDK is absent from this release build.`
);
process.exit(0);
