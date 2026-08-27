#!/usr/bin/env node
/**
 * Release gate: iOS 1.4 NO-TRACKING — no ATT, no Meta native SDK, SKAdNetwork retained.
 *
 * Usage: node scripts/verify-ios-no-att-meta-release.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const PATHS = {
  packageJson: path.join(ROOT, 'package.json'),
  packageLock: path.join(ROOT, 'package-lock.json'),
  capacitorTs: path.join(ROOT, 'capacitor.config.ts'),
  capacitorJson: path.join(ROOT, 'ios', 'App', 'App', 'capacitor.config.json'),
  podfile: path.join(ROOT, 'ios', 'App', 'Podfile'),
  infoPlist: path.join(ROOT, 'ios', 'App', 'App', 'Info.plist'),
  skadConfig: path.join(ROOT, 'config', 'meta-skadnetwork.json'),
  appDelegate: path.join(ROOT, 'ios', 'App', 'App', 'AppDelegate.swift'),
  coordinator: path.join(ROOT, 'ios', 'App', 'App', 'AttTrackingCoordinator.swift'),
  pbxproj: path.join(ROOT, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj'),
};

const FORBIDDEN_SUBSTRINGS = [
  'capacitor-plugin-app-tracking-transparency',
  'CapacitorPluginAppTrackingTransparency',
  'AppTrackingTransparencyPlugin',
  'import AppTrackingTransparency',
  'ATTrackingManager',
  'requestTrackingAuthorization',
  'AppTrackingTransparency.framework',
  'CapacitorFacebookEvents',
  'FBSDKCoreKit',
  'FBAEMKit',
  'import FBSDKCoreKit',
  'ApplicationDelegate.shared',
  'AppEvents.shared',
  'AttTrackingCoordinator',
];

const FORBIDDEN_PLIST_KEYS = [
  'FacebookAppID',
  'FacebookDisplayName',
  'FacebookClientToken',
  'FacebookAutoLogAppEventsEnabled',
  'FacebookAdvertiserIDCollectionEnabled',
];

let failed = false;

function fail(msg) {
  console.error(`[verify-ios-no-att-meta-release] FAIL: ${msg}`);
  failed = true;
}

function ok(msg) {
  console.log(`[verify-ios-no-att-meta-release] OK: ${msg}`);
}

function readUtf8(filePath, label) {
  if (!fs.existsSync(filePath)) {
    fail(`${label} missing: ${path.relative(ROOT, filePath)}`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function assertNoForbidden(haystack, label) {
  for (const needle of FORBIDDEN_SUBSTRINGS) {
    if (haystack.includes(needle)) {
      fail(`${label} contains forbidden "${needle}"`);
    }
  }
}

// npm ATT dependency absent
const pkg = readUtf8(PATHS.packageJson, 'package.json');
if (pkg && pkg.includes('capacitor-plugin-app-tracking-transparency')) {
  fail('package.json still lists capacitor-plugin-app-tracking-transparency');
} else if (pkg) {
  ok('npm ATT dependency absent from package.json');
}

const lock = readUtf8(PATHS.packageLock, 'package-lock.json');
if (lock && lock.includes('capacitor-plugin-app-tracking-transparency')) {
  fail('package-lock.json still references capacitor-plugin-app-tracking-transparency');
} else if (lock) {
  ok('npm lockfile has no ATT plugin package');
}

const capTs = readUtf8(PATHS.capacitorTs, 'capacitor.config.ts');
if (capTs) {
  const iosPluginsBlock = capTs.match(/ios:\s*\{[\s\S]*?includePlugins:\s*\[([\s\S]*?)\]/);
  const iosPlugins = iosPluginsBlock ? iosPluginsBlock[1] : '';
  if (/['"]capacitor-facebook-events['"]/.test(iosPlugins)) {
    fail('capacitor.config.ts still includes capacitor-facebook-events in iOS includePlugins');
  } else {
    ok('capacitor.config.ts excludes capacitor-facebook-events from iOS includePlugins');
  }
  if (/capacitor-plugin-app-tracking-transparency/.test(capTs)) {
    fail('capacitor.config.ts references capacitor-plugin-app-tracking-transparency');
  }
}

if (fs.existsSync(PATHS.capacitorJson)) {
  const capJson = fs.readFileSync(PATHS.capacitorJson, 'utf8');
  assertNoForbidden(capJson, 'ios/App/App/capacitor.config.json');
  if (capJson.includes('FacebookEvents')) {
    fail('capacitor.config.json still registers FacebookEvents plugin');
  } else if (!failed) {
    ok('iOS Capacitor config has no Meta native plugin');
  }
  // Widget is PAUSED for this release alongside Meta — the WidgetBridge JS plugin
  // must not be registered in the generated iOS Capacitor config either.
  if (capJson.includes('capacitor-widget-bridge') || capJson.includes('WidgetBridge')) {
    fail('capacitor.config.json still registers the WidgetBridge plugin (widget is paused for this release)');
  } else {
    ok('iOS Capacitor config has no WidgetBridge plugin (widget paused)');
  }
} else {
  ok('capacitor.config.json absent until cap sync ios (canonical source: capacitor.config.ts)');
}

const podfile = readUtf8(PATHS.podfile, 'Podfile');
if (podfile) {
  assertNoForbidden(podfile, 'Podfile');
  if (!failed) ok('Podfile has no ATT or Meta native pods');
}

const plist = readUtf8(PATHS.infoPlist, 'Info.plist');
if (plist) {
  if (plist.includes('NSUserTrackingUsageDescription')) {
    fail('Info.plist declares NSUserTrackingUsageDescription');
  } else {
    ok('NSUserTrackingUsageDescription absent');
  }
  for (const key of FORBIDDEN_PLIST_KEYS) {
    if (plist.includes(`<key>${key}</key>`)) {
      fail(`Info.plist still declares ${key} (Meta native SDK config)`);
    }
  }
  if (!failed) ok('Facebook SDK plist keys absent');
  if (!plist.includes('<key>SKAdNetworkItems</key>')) {
    fail('Info.plist missing SKAdNetworkItems — run patch-ios-skadnetwork.mjs');
  } else {
    ok('SKAdNetworkItems present');
  }
}

const skadCfg = JSON.parse(fs.readFileSync(PATHS.skadConfig, 'utf8'));
const requiredIds = (skadCfg.identifiers || []).map((id) => String(id).trim().toLowerCase());
if (plist && requiredIds.length) {
  const seen = new Set();
  const block = plist.match(/<key>SKAdNetworkItems<\/key>\s*<array>([\s\S]*?)<\/array>/);
  const inner = block ? block[1] : '';
  for (const id of requiredIds) {
    if (!inner.includes(id)) {
      fail(`SKAdNetworkItems missing required Meta id ${id}`);
    }
    if (seen.has(id)) {
      fail(`duplicate SKAdNetwork identifier in config: ${id}`);
    }
    seen.add(id);
  }
  if (!failed) ok(`required Meta SKAdNetwork identifiers present (${requiredIds.length})`);
}

const delegate = readUtf8(PATHS.appDelegate, 'AppDelegate.swift');
if (delegate) {
  assertNoForbidden(delegate, 'AppDelegate.swift');
  if (!delegate.includes('ApplicationDelegateProxy.shared')) {
    fail('AppDelegate.swift missing Capacitor URL/deep-link handling');
  } else if (!failed) {
    ok('AppDelegate.swift is Capacitor-only (no Meta native SDK)');
  }
}

if (fs.existsSync(PATHS.coordinator)) {
  fail('AttTrackingCoordinator.swift must be removed for iOS 1.4 NO-TRACKING');
} else {
  ok('AttTrackingCoordinator.swift absent');
}

const pbx = readUtf8(PATHS.pbxproj, 'project.pbxproj');
if (pbx && pbx.includes('AttTrackingCoordinator.swift')) {
  fail('project.pbxproj still references AttTrackingCoordinator.swift');
} else if (pbx) {
  ok('project.pbxproj has no AttTrackingCoordinator target reference');
}

const capSync = pkg ? JSON.parse(pkg).scripts['cap:sync:ios'] || '' : '';
if (capSync.includes('patch-ios-facebook-sdk.mjs')) {
  fail('cap:sync:ios still runs patch-ios-facebook-sdk.mjs');
} else if (capSync.includes('patch-ios-remove-meta-native.mjs')) {
  ok('cap:sync:ios runs patch-ios-remove-meta-native.mjs');
} else if (pkg) {
  fail('cap:sync:ios missing patch-ios-remove-meta-native.mjs');
}

console.log('');
if (failed) {
  console.error('[verify-ios-no-att-meta-release] STOP — fix before Archive.');
  process.exit(1);
}
console.log('[verify-ios-no-att-meta-release] All gates passed.');
process.exit(0);
