#!/usr/bin/env node
/**
 * Release gate: no ATT / no IDFA, Meta privacy defaults, SKAdNetwork present.
 * Does not print META_CLIENT_TOKEN or FacebookClientToken values.
 *
 * Usage: node scripts/verify-ios-no-att-meta-release.mjs [--skip-client-token]
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
};

const FORBIDDEN_SUBSTRINGS = [
  'capacitor-plugin-app-tracking-transparency',
  'CapacitorPluginAppTrackingTransparency',
  'AppTrackingTransparencyPlugin',
  'import AppTrackingTransparency',
  'ATTrackingManager',
  'requestTrackingAuthorization',
  'AppTrackingTransparency.framework',
];

const skipClientToken = process.argv.includes('--skip-client-token');

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

// npm dependency absent
const pkg = readUtf8(PATHS.packageJson, 'package.json');
if (pkg && pkg.includes('capacitor-plugin-app-tracking-transparency')) {
  fail('package.json still lists capacitor-plugin-app-tracking-transparency');
} else if (pkg) {
  ok('npm dependency absent from package.json');
}

const lock = readUtf8(PATHS.packageLock, 'package-lock.json');
if (lock && lock.includes('capacitor-plugin-app-tracking-transparency')) {
  fail('package-lock.json still references capacitor-plugin-app-tracking-transparency');
} else if (lock) {
  ok('npm lockfile has no ATT plugin package');
}

const capTs = readUtf8(PATHS.capacitorTs, 'capacitor.config.ts');
if (capTs) {
  assertNoForbidden(capTs, 'capacitor.config.ts');
  if (!failed) ok('capacitor.config.ts has no ATT plugin registration');
}

if (fs.existsSync(PATHS.capacitorJson)) {
  const capJson = fs.readFileSync(PATHS.capacitorJson, 'utf8');
  assertNoForbidden(capJson, 'ios/App/App/capacitor.config.json');
  if (!capJson.includes('capacitor-widget-bridge')) {
    fail('capacitor.config.json missing capacitor-widget-bridge (widget regression)');
  } else if (!failed) {
    ok('iOS Capacitor config has no ATT plugin');
  }
} else {
  ok('capacitor.config.json absent until cap sync ios (canonical source: capacitor.config.ts)');
}

const podfile = readUtf8(PATHS.podfile, 'Podfile');
if (podfile) {
  assertNoForbidden(podfile, 'Podfile');
  if (!failed) ok('Podfile has no ATT pod');
}

const plist = readUtf8(PATHS.infoPlist, 'Info.plist');
if (plist) {
  if (plist.includes('NSUserTrackingUsageDescription')) {
    fail('Info.plist declares NSUserTrackingUsageDescription');
  } else {
    ok('NSUserTrackingUsageDescription absent');
  }
  if (!/FacebookAutoLogAppEventsEnabled<\/key>\s*<false\/>/.test(plist)) {
    fail('FacebookAutoLogAppEventsEnabled is not false');
  } else {
    ok('FacebookAutoLogAppEventsEnabled false');
  }
  if (!/FacebookAdvertiserIDCollectionEnabled<\/key>\s*<false\/>/.test(plist)) {
    fail('FacebookAdvertiserIDCollectionEnabled is not false');
  } else {
    ok('FacebookAdvertiserIDCollectionEnabled false');
  }
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
  const idRe = /<key>SKAdNetworkIdentifier<\/key>\s*<string>([^<]+)<\/string>/g;
  const plistIds = [];
  let m;
  while ((m = idRe.exec(inner)) !== null) {
    const v = m[1].trim().toLowerCase();
    if (plistIds.includes(v)) {
      fail(`duplicate SKAdNetwork identifier in Info.plist: ${v}`);
    }
    plistIds.push(v);
  }
  if (!failed) ok(`required Meta SKAdNetwork identifiers present (${requiredIds.length})`);
}

for (const [label, filePath] of [
  ['AppDelegate.swift', PATHS.appDelegate],
  ['AttTrackingCoordinator.swift', PATHS.coordinator],
]) {
  const src = readUtf8(filePath, label);
  if (src) {
    assertNoForbidden(src, label);
    if (!failed) ok(`${label} has no ATT APIs`);
  }
}

// Client token presence without printing value
if (plist && !skipClientToken) {
  const tokenMatch = plist.match(/<key>FacebookClientToken<\/key>\s*<string>([^<]*)<\/string>/);
  const token = tokenMatch ? tokenMatch[1].trim() : '';
  if (!token || token.length < 8) {
    fail(
      'FacebookClientToken missing or too short — set META_CLIENT_TOKEN before release cap:sync:ios'
    );
  } else {
    ok(`FacebookClientToken present (length ${token.length}, value redacted)`);
  }
} else if (plist && skipClientToken) {
  ok('FacebookClientToken check skipped (--skip-client-token)');
}

console.log('');
if (failed) {
  console.error('[verify-ios-no-att-meta-release] STOP — fix before Archive.');
  process.exit(1);
}
console.log('[verify-ios-no-att-meta-release] All gates passed.');
process.exit(0);
