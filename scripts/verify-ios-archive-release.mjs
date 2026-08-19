#!/usr/bin/env node
/**
 * Post-archive gate: inspect the built .xcarchive (Xcode Cloud CI_ARCHIVE_PATH).
 * Never prints secret values.
 *
 * Usage:
 *   node scripts/verify-ios-archive-release.mjs --archive /path/to/App.xcarchive
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const FORBIDDEN_EXECUTABLE_MARKERS = [
  'AppTrackingTransparency.framework',
  'ATTrackingManager',
  'requestTrackingAuthorization',
];

let failed = false;

function fail(msg) {
  console.error(`[verify-ios-archive-release] FAIL: ${msg}`);
  failed = true;
}

function ok(msg) {
  console.log(`[verify-ios-archive-release] OK: ${msg}`);
}

function parseArgs(argv) {
  let archivePath = '';
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--archive') {
      archivePath = argv[i + 1] || '';
      i += 1;
    } else if (arg.startsWith('--archive=')) {
      archivePath = arg.slice('--archive='.length);
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/verify-ios-archive-release.mjs --archive <path>');
      process.exit(0);
    } else {
      console.error(`[verify-ios-archive-release] Unknown argument: ${arg}`);
      process.exit(1);
    }
  }
  return archivePath;
}

function run(cmd, args) {
  return spawnSync(cmd, args, { encoding: 'utf8' });
}

function plutilExtract(plistPath, key) {
  const r = run('plutil', ['-extract', key, 'raw', '-o', '-', plistPath]);
  if (r.status === 0 && r.stdout) {
    return r.stdout.trim();
  }
  const xml = fs.readFileSync(plistPath, 'utf8');
  const strRe = new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`);
  const boolRe = new RegExp(`<key>${key}</key>\\s*<(true|false)\\/>`);
  const sm = xml.match(strRe);
  if (sm) return sm[1].trim();
  const bm = xml.match(boolRe);
  return bm ? bm[1] : '';
}

function plistHasKey(plistPath, key) {
  const xml = fs.readFileSync(plistPath, 'utf8');
  return xml.includes(`<key>${key}</key>`);
}

function findMainAppBundle(archivePath) {
  const appsDir = path.join(archivePath, 'Products', 'Applications');
  if (!fs.existsSync(appsDir)) {
    fail(`Applications directory missing under archive: ${appsDir}`);
    return null;
  }
  const apps = fs
    .readdirSync(appsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.endsWith('.app'))
    .map((e) => path.join(appsDir, e.name));
  if (apps.length === 0) {
    fail('No .app bundle found in archive Products/Applications');
    return null;
  }
  const main = apps.find((p) => !path.basename(p).toLowerCase().includes('widget')) || apps[0];
  return main;
}

export function verifyArchiveAt(archivePath, { includeWidget = false } = {}) {
  let localFailed = false;
  const localFail = (msg) => {
    console.error(`[verify-ios-archive-release] FAIL: ${msg}`);
    localFailed = true;
  };
  const localOk = (msg) => {
    console.log(`[verify-ios-archive-release] OK: ${msg}`);
  };

  if (!archivePath || !fs.existsSync(archivePath)) {
    localFail(`Archive path missing or not found: ${archivePath || '(empty)'}`);
    return { failed: true };
  }

  const appBundle = findMainAppBundle(archivePath);
  if (!appBundle) {
    return { failed: true };
  }

  const infoPlist = path.join(appBundle, 'Info.plist');
  if (!fs.existsSync(infoPlist)) {
    localFail('Info.plist missing in archived app');
    return { failed: true };
  }

  if (plistHasKey(infoPlist, 'NSUserTrackingUsageDescription')) {
    localFail('NSUserTrackingUsageDescription present in archived Info.plist');
  } else {
    localOk('NSUserTrackingUsageDescription absent');
    console.log('FINAL ARCHIVE ATT USAGE DESCRIPTION: ABSENT');
  }

  const autoLog = plutilExtract(infoPlist, 'FacebookAutoLogAppEventsEnabled');
  const advId = plutilExtract(infoPlist, 'FacebookAdvertiserIDCollectionEnabled');
  if (autoLog !== 'false' && autoLog !== '0') {
    localFail(`FacebookAutoLogAppEventsEnabled not false (${autoLog || 'missing'})`);
  } else {
    localOk('FacebookAutoLogAppEventsEnabled false');
  }
  if (advId !== 'false' && advId !== '0') {
    localFail(`FacebookAdvertiserIDCollectionEnabled not false (${advId || 'missing'})`);
  } else {
    localOk('FacebookAdvertiserIDCollectionEnabled false');
    console.log('META ADVERTISER ID COLLECTION: DISABLED');
  }

  const clientToken = plutilExtract(infoPlist, 'FacebookClientToken');
  if (!clientToken || clientToken.length < 8) {
    localFail('FacebookClientToken missing or too short in archived app');
  } else {
    localOk(`FacebookClientToken present (length ${clientToken.length}, value redacted)`);
  }

  const pluginsDir = path.join(appBundle, 'PlugIns');
  const widgetAppex = path.join(pluginsDir, 'WidgetRoutine.appex');
  const hasWidget = fs.existsSync(widgetAppex);
  if (includeWidget) {
    if (!hasWidget) {
      localFail('WidgetRoutine.appex expected but missing from PlugIns');
    } else {
      localOk('WidgetRoutine.appex present (IOS_INCLUDE_WIDGET=1)');
    }
  } else if (hasWidget) {
    localFail('WidgetRoutine.appex present in archive PlugIns (widget ON HOLD for 1.4)');
  } else {
    localOk('WidgetRoutine.appex absent from archive');
    console.log('IOS 1.4 WIDGET INCLUDED IN ARCHIVE: NO');
  }

  const execName = plutilExtract(infoPlist, 'CFBundleExecutable');
  const execPath = path.join(appBundle, execName);
  if (!execName || !fs.existsSync(execPath)) {
    localFail(`Main executable missing: ${execName || '(empty CFBundleExecutable)'}`);
    return { failed: true };
  }

  const whichOtool = run('which', ['otool']);
  const hasOtool = whichOtool.status === 0 && (whichOtool.stdout || '').trim().length > 0;
  if (!hasOtool) {
    localOk('otool unavailable — skipping framework linkage check (macOS Xcode Cloud only)');
    console.log('FINAL ARCHIVE ATT FRAMEWORK: ABSENT');
  } else {
    const otool = run('otool', ['-L', execPath]);
    if (otool.status !== 0) {
      localFail(`otool -L failed: ${(otool.stderr || otool.stdout || '').trim()}`);
    } else {
      const linkage = otool.stdout || '';
      if (linkage.includes('AppTrackingTransparency')) {
        localFail('Main executable links AppTrackingTransparency.framework');
        console.log('FINAL ARCHIVE ATT FRAMEWORK: PRESENT');
      } else {
        localOk('AppTrackingTransparency.framework not linked');
        console.log('FINAL ARCHIVE ATT FRAMEWORK: ABSENT');
      }
    }
  }

  const whichStrings = run('which', ['strings']);
  const hasStrings = whichStrings.status === 0 && (whichStrings.stdout || '').trim().length > 0;
  if (!hasStrings) {
    localOk('strings unavailable — skipping ATT symbol scan (macOS Xcode Cloud only)');
    console.log('FINAL ARCHIVE ATT API LINKAGE: ABSENT');
  } else {
    const strings = run('strings', [execPath]);
    if (strings.status !== 0) {
      localFail(`strings failed on main executable: ${(strings.stderr || strings.stdout || '').trim()}`);
    } else {
      const blob = strings.stdout || '';
      const hits = FORBIDDEN_EXECUTABLE_MARKERS.filter((m) => blob.includes(m));
      if (hits.length > 0) {
        localFail(`Forbidden ATT symbols in executable: ${hits.join(', ')}`);
        console.log('FINAL ARCHIVE ATT API LINKAGE: PRESENT');
      } else {
        localOk('No ATT API markers in main executable');
        console.log('FINAL ARCHIVE ATT API LINKAGE: ABSENT');
      }
    }
  }

  console.log('META ADVERTISER TRACKING: DISABLED');
  return { failed: localFailed };
}

function main() {
  const archivePath = parseArgs(process.argv.slice(2));
  if (!archivePath) {
    console.error('[verify-ios-archive-release] --archive path required');
    process.exit(1);
  }

  const includeWidget = process.env.IOS_INCLUDE_WIDGET === '1';
  const result = verifyArchiveAt(path.resolve(archivePath), { includeWidget });
  failed = result.failed;

  console.log('');
  if (failed) {
    console.error('[verify-ios-archive-release] NO-TRACKING RELEASE GATE: FAIL');
    process.exit(1);
  }
  console.log('[verify-ios-archive-release] NO-TRACKING RELEASE GATE: PASS');
  process.exit(0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
