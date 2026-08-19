#!/usr/bin/env node
/**
 * Post-archive gate: inspect the built .xcarchive (Xcode Cloud CI_ARCHIVE_PATH).
 * Never prints secret values.
 *
 * Usage:
 *   node scripts/verify-ios-archive-release.mjs --archive /path/to/App.xcarchive
 *
 * Release mode (mandatory otool + strings) activates when:
 *   - CI_XCODEBUILD_ACTION=archive (Xcode Cloud post-build), or
 *   - --release flag (explicit; for local macOS release verification)
 *
 * Unit tests use default non-release mode without --release and without CI_XCODEBUILD_ACTION=archive.
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
  let releaseMode = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--archive') {
      archivePath = argv[i + 1] || '';
      i += 1;
    } else if (arg.startsWith('--archive=')) {
      archivePath = arg.slice('--archive='.length);
    } else if (arg === '--release') {
      releaseMode = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(
        'Usage: node scripts/verify-ios-archive-release.mjs --archive <path> [--release]'
      );
      process.exit(0);
    } else {
      console.error(`[verify-ios-archive-release] Unknown argument: ${arg}`);
      process.exit(1);
    }
  }
  return { archivePath, releaseMode };
}

function run(cmd, args) {
  return spawnSync(cmd, args, { encoding: 'utf8' });
}

function toolAvailable(cmd) {
  const which = run('which', [cmd]);
  return which.status === 0 && (which.stdout || '').trim().length > 0;
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

function inspectBinaryLinkage(execPath, releaseMode, localFail, localOk) {
  const hasOtool = toolAvailable('otool');
  if (!hasOtool) {
    if (releaseMode) {
      localFail('otool is required for release archive verification (AppTrackingTransparency framework check)');
      return false;
    }
    localOk('otool unavailable — framework linkage check skipped (non-release test mode)');
    return false;
  }

  const otool = run('otool', ['-L', execPath]);
  if (otool.status !== 0) {
    localFail(`otool -L failed: ${(otool.stderr || otool.stdout || '').trim()}`);
    return false;
  }

  const linkage = otool.stdout || '';
  if (linkage.includes('AppTrackingTransparency')) {
    localFail('Main executable links AppTrackingTransparency.framework');
    if (releaseMode) {
      console.log('FINAL ARCHIVE ATT FRAMEWORK: PRESENT');
    }
    return false;
  }

  localOk('AppTrackingTransparency.framework not linked');
  if (releaseMode) {
    console.log('FINAL ARCHIVE ATT FRAMEWORK: ABSENT');
  }
  return true;
}

function inspectBinarySymbols(execPath, releaseMode, localFail, localOk) {
  const hasStrings = toolAvailable('strings');
  if (!hasStrings) {
    if (releaseMode) {
      localFail('strings is required for release archive verification (ATT API/symbol check)');
      return false;
    }
    localOk('strings unavailable — ATT symbol scan skipped (non-release test mode)');
    return false;
  }

  const strings = run('strings', [execPath]);
  if (strings.status !== 0) {
    localFail(`strings failed on main executable: ${(strings.stderr || strings.stdout || '').trim()}`);
    return false;
  }

  const blob = strings.stdout || '';
  const hits = FORBIDDEN_EXECUTABLE_MARKERS.filter((m) => blob.includes(m));
  if (hits.length > 0) {
    localFail(`Forbidden ATT symbols in executable: ${hits.join(', ')}`);
    if (releaseMode) {
      console.log('FINAL ARCHIVE ATT API LINKAGE: PRESENT');
    }
    return false;
  }

  localOk('No ATT API markers in main executable');
  if (releaseMode) {
    console.log('FINAL ARCHIVE ATT API LINKAGE: ABSENT');
  }
  return true;
}

export function verifyArchiveAt(
  archivePath,
  { includeWidget = false, releaseMode = false } = {}
) {
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
    return { failed: true, releaseMode };
  }

  const appBundle = findMainAppBundle(archivePath);
  if (!appBundle) {
    return { failed: true, releaseMode };
  }

  const infoPlist = path.join(appBundle, 'Info.plist');
  if (!fs.existsSync(infoPlist)) {
    localFail('Info.plist missing in archived app');
    return { failed: true, releaseMode };
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
    return { failed: true, releaseMode };
  }

  inspectBinaryLinkage(execPath, releaseMode, localFail, localOk);
  inspectBinarySymbols(execPath, releaseMode, localFail, localOk);

  return { failed: localFailed, releaseMode };
}

function main() {
  const { archivePath, releaseMode: releaseFlag } = parseArgs(process.argv.slice(2));
  if (!archivePath) {
    console.error('[verify-ios-archive-release] --archive path required');
    process.exit(1);
  }

  const releaseMode =
    releaseFlag || String(process.env.CI_XCODEBUILD_ACTION || '').trim() === 'archive';
  const includeWidget = process.env.IOS_INCLUDE_WIDGET === '1';
  const result = verifyArchiveAt(path.resolve(archivePath), { includeWidget, releaseMode });
  failed = result.failed;

  console.log('');
  if (failed) {
    console.error('[verify-ios-archive-release] NO-TRACKING RELEASE GATE: FAIL');
    process.exit(1);
  }

  if (releaseMode) {
    console.log('META ADVERTISER TRACKING: PRE-BUILD VERIFIED DISABLED');
  }
  console.log('[verify-ios-archive-release] NO-TRACKING RELEASE GATE: PASS');
  process.exit(0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
