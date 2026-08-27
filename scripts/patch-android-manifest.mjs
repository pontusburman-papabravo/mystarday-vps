#!/usr/bin/env node
/**
 * Patch AndroidManifest.xml after `npx cap sync android`.
 * Adds App Links, push notification permission, and camera permission strings.
 *
 * Usage: node scripts/patch-android-manifest.mjs
 */
import fs from 'fs';
import path from 'path';

const manifestPath = path.join(
  process.cwd(),
  'android',
  'app',
  'src',
  'main',
  'AndroidManifest.xml'
);

const APP_LINK_HOST = process.env.ANDROID_APP_LINK_HOST || 'mystarday.se';

const APP_LINK_PATHS = [
  '/accept-invite',
  '/pedagog-invite',
  '/verify-email',
  '/verify-email-change',
  '/reset-password',
  '/register',
  '/invite',
  '/child-login',
  '/child-dashboard',
  '/open/child',
];

const PERMISSIONS = [
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.CAMERA',
];

const INTENT_FILTER_MARKER = 'android.intent.action.VIEW';

// RevenueCat requires the purchasing Activity's launchMode to be "standard" or
// "singleTop" — backgrounding the app during Google Play's payment verification
// (e.g. bank redirect) with "singleTask" can incorrectly cancel the purchase.
// https://www.revenuecat.com/docs/getting-started/installation/android
// Capacitor's default template ships MainActivity with launchMode="singleTask"
// for deep-link handling; "singleTop" keeps the same single-instance/onNewIntent
// behavior for App Links while satisfying RevenueCat's requirement.
const REVENUECAT_COMPATIBLE_LAUNCH_MODES = new Set(['standard', 'singleTop']);
const MAIN_ACTIVITY_LAUNCH_MODE_RE = /(<activity\s[^>]*android:name="\.MainActivity"[^>]*android:launchMode=")([^"]+)(")/;

function patchMainActivityLaunchMode(content) {
  const match = content.match(MAIN_ACTIVITY_LAUNCH_MODE_RE);
  if (!match) {
    return { content, changed: false, note: 'MainActivity launchMode attribute not found (nothing to patch)' };
  }
  const currentMode = match[2];
  if (REVENUECAT_COMPATIBLE_LAUNCH_MODES.has(currentMode)) {
    return { content, changed: false, note: `MainActivity launchMode already RevenueCat-compatible (${currentMode})` };
  }
  const updated = content.replace(MAIN_ACTIVITY_LAUNCH_MODE_RE, '$1singleTop$3');
  return { content: updated, changed: true, note: `MainActivity launchMode changed from "${currentMode}" to "singleTop" (RevenueCat requirement)` };
}

function buildAppLinkIntentFilter() {
  const dataLines = APP_LINK_PATHS.map(
    (prefix) =>
      `                <data android:scheme="https" android:host="${APP_LINK_HOST}" android:pathPrefix="${prefix}" />`
  ).join('\n');

  return `
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
${dataLines}
            </intent-filter>`;
}

function patchManifest(content) {
  let updated = content;
  let changed = false;

  for (const perm of PERMISSIONS) {
    if (updated.includes(`android:name="${perm}"`)) {
      console.log('Already set:', perm);
      continue;
    }
    const insert = `    <uses-permission android:name="${perm}" />\n`;
    const internetIdx = updated.indexOf('<uses-permission android:name="android.permission.INTERNET"');
    if (internetIdx === -1) {
      const manifestClose = updated.indexOf('</manifest>');
      updated = updated.slice(0, manifestClose) + insert + updated.slice(manifestClose);
    } else {
      const lineEnd = updated.indexOf('\n', internetIdx);
      updated = updated.slice(0, lineEnd + 1) + insert + updated.slice(lineEnd + 1);
    }
    changed = true;
    console.log('Added permission:', perm);
  }

  if (!updated.includes(INTENT_FILTER_MARKER) || !updated.includes('android:autoVerify="true"')) {
    const launcherEnd = updated.indexOf('</intent-filter>', updated.indexOf('android.intent.action.MAIN'));
    if (launcherEnd === -1) {
      throw new Error('Could not find LAUNCHER intent-filter in AndroidManifest.xml');
    }
    const insertAt = launcherEnd + '</intent-filter>'.length;
    updated = updated.slice(0, insertAt) + buildAppLinkIntentFilter() + updated.slice(insertAt);
    changed = true;
    console.log('Added App Links intent-filter for', APP_LINK_HOST);
  } else {
    console.log('App Links intent-filter already present');
  }

  return { content: updated, changed };
}

if (!fs.existsSync(manifestPath)) {
  console.error('Not found:', manifestPath);
  console.error('Run: npx cap add android && npm run cap:sync:android');
  process.exit(1);
}

const before = fs.readFileSync(manifestPath, 'utf8');
const result = patchManifest(before);

const launchModeResult = patchMainActivityLaunchMode(result.content);
console.log(launchModeResult.note);
const finalContent = launchModeResult.content;
const anyChanged = result.changed || launchModeResult.changed;

if (!anyChanged) {
  console.log('AndroidManifest.xml already patched.');
} else {
  fs.writeFileSync(manifestPath, finalContent);
  console.log('Patched AndroidManifest.xml');
}

console.log('Next: set ANDROID_SHA256_CERT_FINGERPRINT on server for assetlinks.json');
