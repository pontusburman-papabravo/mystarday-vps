#!/usr/bin/env node
/**
 * Fail CI / local builds if capacitor-facebook-events drifts so that our
 * privacy patches no longer match (which could re-enable AutoLogAppEvents).
 *
 * Usage:
 *   node scripts/verify-capacitor-facebook-events-privacy.mjs
 *   node scripts/verify-capacitor-facebook-events-privacy.mjs --apply
 *
 * Exit 0: installed plugin matches expected privacy-safe markers.
 * Exit 1: missing plugin, upstream drift, or unsafe AutoLog-on-start restored.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PLUGIN_ROOT = path.join(ROOT, 'node_modules', 'capacitor-facebook-events');

const IOS_PLUGIN = path.join(PLUGIN_ROOT, 'ios', 'Plugin', 'FacebookEvents.swift');
const IOS_PLUGIN_BRIDGE = path.join(PLUGIN_ROOT, 'ios', 'Plugin', 'FacebookEventsPlugin.swift');
const ANDROID_PLUGIN = path.join(
  PLUGIN_ROOT,
  'android',
  'src',
  'main',
  'java',
  'com',
  'dabchy',
  'plugins',
  'facebookevents',
  'FacebookEventsPlugin.java'
);

/** Markers that must remain after our privacy patch (fail-closed cold start). */
const REQUIRED_MARKERS = {
  ios: [
    'msd_meta_marketing_consent',
    'configureConsent',
    'object(forKey: FacebookEvents.marketingConsentKey) as? Bool ?? false',
    'guard hasPersistedMarketingConsent()',
    'When enabling: do NOT call activateApp() here',
  ],
  iosBridge: [
    'configureConsent',
    'call.getBool("marketingConsent") ?? false',
    'hasPersistedMarketingConsent()',
  ],
  android: [
    'KEY_MARKETING',
    'isMarketingConsentPersisted()',
    'prefs.contains(KEY_MARKETING)',
    'When enabling: do NOT activateApp() here',
    'applyPersistedConsentWithoutActivate',
  ],
};

/** Unsafe upstream patterns that must NOT be present after patch. */
const FORBIDDEN_MARKERS = {
  ios: [
    /configureConsent[\s\S]{0,400}activateApp\(\)/,
  ],
  android: [
    /configureConsent[\s\S]{0,500}AppEventsLogger\.activateApp\(/,
    /void load\(\)[\s\S]{0,300}AppEventsLogger\.activateApp\(/,
  ],
};

function fail(msg) {
  console.error(`[verify-facebook-events-privacy] FAIL: ${msg}`);
  process.exit(1);
}

function readOrFail(filePath, label) {
  if (!fs.existsSync(filePath)) {
    fail(`${label} missing at ${path.relative(ROOT, filePath)}. Run npm install and patch scripts.`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function checkFile(label, content, required, forbidden) {
  for (const marker of required) {
    if (!content.includes(marker)) {
      fail(`${label}: required privacy marker missing:\n  ${marker}`);
    }
  }
  for (const marker of forbidden) {
    if (marker.test(content)) {
      fail(`${label}: unsafe upstream AutoLog/activateApp pattern still present in patched plugin`);
    }
  }
}

const applyFirst = process.argv.includes('--apply');
if (applyFirst) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'patch-capacitor-facebook-events-privacy.mjs')], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (r.status !== 0) {
    process.exit(r.status || 1);
  }
}

if (!fs.existsSync(PLUGIN_ROOT)) {
  console.warn('[verify-facebook-events-privacy] capacitor-facebook-events not installed — skip');
  process.exit(0);
}

const ios = readOrFail(IOS_PLUGIN, 'FacebookEvents.swift');
const iosBridge = readOrFail(IOS_PLUGIN_BRIDGE, 'FacebookEventsPlugin.swift');
const android = readOrFail(ANDROID_PLUGIN, 'FacebookEventsPlugin.java');

checkFile('iOS FacebookEvents.swift', ios, REQUIRED_MARKERS.ios, FORBIDDEN_MARKERS.ios);
checkFile('iOS FacebookEventsPlugin.swift', iosBridge, REQUIRED_MARKERS.iosBridge, []);
checkFile('Android FacebookEventsPlugin.java', android, REQUIRED_MARKERS.android, FORBIDDEN_MARKERS.android);

// Durable patch sources must stay in sync with installed plugin.
for (const [label, relFrom, relTo] of [
  ['iOS FacebookEvents.swift', 'scripts/ios/FacebookEvents.swift.patched', IOS_PLUGIN],
  ['Android FacebookEventsPlugin.java', 'scripts/android/FacebookEventsPlugin.java.patched', ANDROID_PLUGIN],
]) {
  const from = path.join(ROOT, relFrom);
  const installed = fs.readFileSync(relTo, 'utf8');
  const source = readOrFail(from, label);
  if (source !== installed) {
    fail(`${label}: node_modules copy differs from ${relFrom}. Re-run patch script.`);
  }
}

console.log('[verify-facebook-events-privacy] OK — capacitor-facebook-events privacy patch is applied.');
process.exit(0);
