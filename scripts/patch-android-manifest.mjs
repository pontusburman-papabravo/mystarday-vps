#!/usr/bin/env node
/**
 * Patch AndroidManifest.xml after `npx cap sync android`.
 * Adds App Links, push notification permission, and camera permission strings.
 *
 * Usage: node scripts/patch-android-manifest.mjs
 */
import fs from 'fs';
import path from 'path';
import { ensureMainActivityAppLinks, OPEN_CHILD_PATH } from './lib/android-app-links.mjs';

const manifestPath = path.join(
  process.cwd(),
  'android',
  'app',
  'src',
  'main',
  'AndroidManifest.xml'
);

const PERMISSIONS = [
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.CAMERA',
];

// RevenueCat requires the purchasing Activity's launchMode to be "standard" or
// "singleTop". Capacitor's template uses "singleTask", which can cancel a
// purchase if Google Play backgrounds the app for bank verification.
// https://www.revenuecat.com/docs/getting-started/installation/android
// https://www.revenuecat.com/docs/getting-started/installation/capacitor
//
// Android launchMode semantics (not interchangeable):
// https://developer.android.com/guide/topics/manifest/activity-element#lmode
// https://developer.android.com/guide/components/activities/tasks-and-back-stack
//
// We set "singleTop":
// - RevenueCat-compatible ("standard" or "singleTop")
// - If MainActivity is already the topmost activity in the current task,
//   the new intent is delivered via onNewIntent()
// - This is NOT semantically equivalent to singleTask (singleTask reuses a
//   single task-root instance and can clear activities above it)
// - App Link / back-stack behavior must be verified separately on device
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

function patchPermissions(content) {
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

  return { content: updated, changed };
}

function patchManifest(content) {
  const permissions = patchPermissions(content);
  let updated = permissions.content;
  let changed = permissions.changed;

  const appLinks = ensureMainActivityAppLinks(updated);
  updated = appLinks.content;
  if (appLinks.changed) {
    changed = true;
    console.log(
      'Patched App Links intent-filter for',
      appLinks.host,
      'added',
      appLinks.added.join(', ')
    );
  } else {
    console.log(
      'App Links intent-filter already complete for',
      appLinks.host,
      `(includes mandatory ${OPEN_CHILD_PATH})`
    );
  }

  return { content: updated, changed };
}

if (!fs.existsSync(manifestPath)) {
  console.error('Not found:', manifestPath);
  console.error('Run: npx cap add android && npm run cap:sync:android');
  process.exit(1);
}

try {
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
} catch (err) {
  console.error('FAIL:', err.message);
  process.exit(1);
}
