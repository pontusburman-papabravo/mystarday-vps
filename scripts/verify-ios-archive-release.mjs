#!/usr/bin/env node
/**
 * Post-archive gate: inspect the built .xcarchive (Xcode Cloud CI_ARCHIVE_PATH).
 * Never prints secret values.
 *
 * Usage:
 *   node scripts/verify-ios-archive-release.mjs --archive /path/to/App.xcarchive
 *
 * Release mode (mandatory otool + strings on every shipped Mach-O) activates when:
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

const FORBIDDEN_STRING_MARKERS = [
  'ATTrackingManager',
  'requestTrackingAuthorization',
  'AppTrackingTransparency.framework',
];

const FORBIDDEN_PATH_MARKERS = [
  'AppTrackingTransparency.framework',
  'CapacitorPluginAppTrackingTransparency',
  'AppTrackingTransparencyPlugin',
  'FBSDKCoreKit.framework',
  'FBAEMKit.framework',
  'FBSDKCoreKit_Basics.framework',
  'CapacitorFacebookEvents',
];

const MACHO_MAGICS = new Set([
  0xfeedfacf, 0xcffaedfe, // MH_MAGIC_64 / MH_CIGAM_64
  0xcafebabe, 0xbebafeca, // FAT_MAGIC / FAT_CIGAM
  0xfeedface, 0xcefaedfe, // MH_MAGIC / MH_CIGAM
]);

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

function loadPlistObject(plistPath, relPath, releaseMode, localFail) {
  if (toolAvailable('plutil')) {
    const r = run('plutil', ['-convert', 'json', '-o', '-', plistPath]);
    if (r.status === 0 && r.stdout) {
      try {
        return JSON.parse(r.stdout);
      } catch {
        localFail(`PrivacyInfo.xcprivacy JSON parse failed: ${relPath}`);
        return null;
      }
    }
    if (releaseMode) {
      localFail(`plutil could not read privacy manifest: ${relPath}`);
      return null;
    }
  }

  if (!releaseMode) {
    try {
      const xml = fs.readFileSync(plistPath, 'utf8');
      return parsePrivacyPlistXml(xml);
    } catch {
      localFail(`PrivacyInfo.xcprivacy read failed: ${relPath}`);
      return null;
    }
  }

  localFail(`plutil required to read privacy manifest in release mode: ${relPath}`);
  return null;
}

function parsePrivacyPlistXml(xml) {
  const obj = {};
  const tracking = xml.match(/<key>NSPrivacyTracking<\/key>\s*<(true|false)\/>/);
  if (tracking) obj.NSPrivacyTracking = tracking[1] === 'true';

  const domainsBlock = xml.match(
    /<key>NSPrivacyTrackingDomains<\/key>\s*<array>([\s\S]*?)<\/array>/
  );
  if (domainsBlock) {
    const domains = [...domainsBlock[1].matchAll(/<string>([^<]*)<\/string>/g)].map((m) => m[1]);
    obj.NSPrivacyTrackingDomains = domains;
  } else {
    obj.NSPrivacyTrackingDomains = [];
  }

  const collectedBlock = xml.match(
    /<key>NSPrivacyCollectedDataTypes<\/key>\s*<array>([\s\S]*?)<\/array>/
  );
  obj.NSPrivacyCollectedDataTypes = [];
  if (collectedBlock) {
    for (const dictBlock of collectedBlock[1].matchAll(/<dict>([\s\S]*?)<\/dict>/g)) {
      const entry = {};
      const trackingFlag = dictBlock[1].match(
        /<key>NSPrivacyCollectedDataTypeTracking<\/key>\s*<(true|false)\/>/
      );
      if (trackingFlag) {
        entry.NSPrivacyCollectedDataTypeTracking = trackingFlag[1] === 'true';
      }
      obj.NSPrivacyCollectedDataTypes.push(entry);
    }
  }

  return obj;
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
  return apps.find((p) => !path.basename(p).toLowerCase().includes('widget')) || apps[0];
}

function walkFiles(rootDir) {
  const out = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        out.push(full);
      }
    }
  }
  return out;
}

function relAppPath(appBundle, filePath) {
  return path.relative(appBundle, filePath).split(path.sep).join('/');
}

function isMachOMagic(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(4);
    fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);
    return MACHO_MAGICS.has(buf.readUInt32LE(0));
  } catch {
    return false;
  }
}

function isMachOBinary(filePath, releaseMode) {
  if (isMachOMagic(filePath)) return true;
  if (releaseMode && toolAvailable('file')) {
    const r = run('file', ['-b', filePath]);
    if (r.status === 0 && (r.stdout || '').includes('Mach-O')) return true;
  }
  return false;
}

function collectShippedMachOBinaries(appBundle, releaseMode) {
  return walkFiles(appBundle).filter((f) => isMachOBinary(f, releaseMode));
}

function scanBundlePaths(appBundle, localFail) {
  let hit = false;
  const stack = [appBundle];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = relAppPath(appBundle, full);
      for (const marker of FORBIDDEN_PATH_MARKERS) {
        if (rel.toLowerCase().includes(marker.toLowerCase())) {
          localFail(`Forbidden ATT bundle path: ${rel} (${marker})`);
          hit = true;
          break;
        }
      }
      if (entry.isDirectory()) {
        stack.push(full);
      }
    }
  }
  return !hit;
}

function scanMetaNativeAbsence(appBundle, localFail, localOk) {
  const metaMarkers = [
    'FBSDKCoreKit.framework',
    'FBAEMKit.framework',
    'FBSDKCoreKit_Basics.framework',
    'CapacitorFacebookEvents',
  ];
  let hit = false;
  for (const rel of walkFiles(appBundle).map((f) => relAppPath(appBundle, f))) {
    for (const marker of metaMarkers) {
      if (rel.toLowerCase().includes(marker.toLowerCase())) {
        localFail(`Meta native SDK artifact present: ${rel} (${marker})`);
        hit = true;
      }
    }
  }
  if (!hit) {
    localOk('No Meta native SDK frameworks in archived app bundle');
    console.log('IOS META NATIVE SDK: ABSENT');
  }
  return !hit;
}

function inspectMachOBinary(binaryPath, relPath, releaseMode, hasOtool, hasStrings, localFail) {
  let clean = true;

  if (hasOtool) {
    const otool = run('otool', ['-L', binaryPath]);
    if (otool.status !== 0) {
      localFail(`otool -L failed for ${relPath}: ${(otool.stderr || otool.stdout || '').trim()}`);
      return false;
    }
    if ((otool.stdout || '').includes('AppTrackingTransparency')) {
      localFail(`${relPath}: AppTrackingTransparency.framework linked`);
      clean = false;
    }
  } else if (releaseMode) {
    localFail('otool is required for release archive verification (AppTrackingTransparency framework check)');
    return false;
  }

  if (hasStrings) {
    const strings = run('strings', [binaryPath]);
    if (strings.status !== 0) {
      localFail(`strings failed for ${relPath}: ${(strings.stderr || strings.stdout || '').trim()}`);
      return false;
    }
    const blob = strings.stdout || '';
    for (const marker of FORBIDDEN_STRING_MARKERS) {
      if (blob.includes(marker)) {
        localFail(`${relPath}: ${marker}`);
        clean = false;
      }
    }
  } else if (releaseMode) {
    localFail('strings is required for release archive verification (ATT API/symbol check)');
    return false;
  }

  return clean;
}

function scanAllMachOBinaries(appBundle, releaseMode, localFail, localOk) {
  const hasOtool = toolAvailable('otool');
  const hasStrings = toolAvailable('strings');

  if (releaseMode) {
    if (!hasOtool) {
      localFail('otool is required for release archive verification (AppTrackingTransparency framework check)');
      return { checked: 0, allClean: false };
    }
    if (!hasStrings) {
      localFail('strings is required for release archive verification (ATT API/symbol check)');
      return { checked: 0, allClean: false };
    }
  }

  const binaries = collectShippedMachOBinaries(appBundle, releaseMode);
  if (binaries.length === 0) {
    localFail('No Mach-O binaries found in archived .app bundle');
    return { checked: 0, allClean: false };
  }

  let allClean = true;
  for (const binaryPath of binaries) {
    const rel = relAppPath(appBundle, binaryPath);
    const clean = inspectMachOBinary(
      binaryPath,
      rel,
      releaseMode,
      hasOtool,
      hasStrings,
      localFail
    );
    if (!clean) allClean = false;
  }

  if (allClean && releaseMode) {
    localOk(`All ${binaries.length} shipped Mach-O binaries checked (otool + strings)`);
    console.log('FINAL ARCHIVE ATT FRAMEWORK: ABSENT');
    console.log('FINAL ARCHIVE ATT API LINKAGE: ABSENT');
    console.log('ENTIRE APP BUNDLE ATT SCAN: PASS');
    console.log('ALL SHIPPED MACH-O BINARIES CHECKED IN RELEASE MODE: YES');
  } else if (allClean && !releaseMode) {
    if (hasStrings) {
      localOk(`Shipped Mach-O binaries scanned (${binaries.length}, strings only — non-release mode)`);
    } else {
      localOk(`Mach-O binaries present (${binaries.length}); binary scan skipped (non-release mode)`);
    }
  }

  return { checked: binaries.length, allClean };
}

function scanPrivacyManifests(appBundle, releaseMode, localFail, localOk) {
  const manifests = walkFiles(appBundle).filter((f) => path.basename(f) === 'PrivacyInfo.xcprivacy');
  let allClean = true;

  for (const manifestPath of manifests) {
    const rel = relAppPath(appBundle, manifestPath);
    const obj = loadPlistObject(manifestPath, rel, releaseMode, localFail);
    if (!obj) {
      allClean = false;
      continue;
    }

    if (obj.NSPrivacyTracking === true) {
      localFail(`${rel}: NSPrivacyTracking=true`);
      allClean = false;
    }

    const domains = Array.isArray(obj.NSPrivacyTrackingDomains) ? obj.NSPrivacyTrackingDomains : [];
    if (domains.length > 0) {
      localFail(`${rel}: NSPrivacyTrackingDomains non-empty (${domains.length})`);
      allClean = false;
    }

    const collected = Array.isArray(obj.NSPrivacyCollectedDataTypes)
      ? obj.NSPrivacyCollectedDataTypes
      : [];
    for (const entry of collected) {
      if (entry && entry.NSPrivacyCollectedDataTypeTracking === true) {
        localFail(`${rel}: NSPrivacyCollectedDataTypeTracking=true`);
        allClean = false;
      }
    }
  }

  if (allClean) {
    localOk(
      manifests.length > 0
        ? `Privacy manifests checked (${manifests.length}), no tracking declared`
        : 'No PrivacyInfo.xcprivacy manifests in bundle (tracking scan N/A)'
    );
    console.log('PRIVACY MANIFEST TRACKING SCAN: PASS');
  }

  return { count: manifests.length, allClean };
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

  const widgetAppex = path.join(appBundle, 'PlugIns', 'WidgetRoutine.appex');
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

  scanBundlePaths(appBundle, localFail);
  const metaNativeClean = scanMetaNativeAbsence(appBundle, localFail, localOk);
  scanPrivacyManifests(appBundle, releaseMode, localFail, localOk);
  scanAllMachOBinaries(appBundle, releaseMode, localFail, localOk);

  return { failed: localFailed || !metaNativeClean, releaseMode };
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
    console.log('IOS 1.4 NO-TRACKING: Meta native SDK not shipped');
  }
  console.log('[verify-ios-archive-release] NO-TRACKING RELEASE GATE: PASS');
  process.exit(0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
