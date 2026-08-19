'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const VERIFY_SCRIPT = path.join(ROOT, 'scripts', 'verify-ios-archive-release.mjs');

function runArchiveVerify(archivePath, extraArgs = [], extraEnv = {}) {
  return spawnSync(process.execPath, [VERIFY_SCRIPT, '--archive', archivePath, ...extraArgs], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...extraEnv },
  });
}

function writeMinimalPlist(filePath, entries) {
  const body = entries
    .map(([key, value, type]) => {
      if (type === 'bool') {
        return `<key>${key}</key><${value}/>`;
      }
      return `<key>${key}</key><string>${value}</string>`;
    })
    .join('');
  fs.writeFileSync(
    filePath,
    `<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict>${body}</dict></plist>`
  );
}

/** Fake Mach-O (MH_MAGIC_64) so bundle binary scan finds a inspectable file. */
function writeFakeMachO(filePath, payload = 'main-binary') {
  const body = Buffer.from(String(payload), 'utf8');
  const buf = Buffer.alloc(4 + body.length);
  buf.writeUInt32LE(0xfeedfacf, 0);
  body.copy(buf, 4);
  fs.writeFileSync(filePath, buf);
}

function makeFixtureArchive({
  withWidget = false,
  withAttPlist = false,
  withMetaFramework = false,
  execMarker = '',
  attFrameworkPath = false,
  nestedFrameworkMarker = null,
  privacyManifest = null,
} = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xcarchive-'));
  const archive = path.join(dir, 'App.xcarchive');
  const appDir = path.join(archive, 'Products', 'Applications', 'App.app');
  fs.mkdirSync(appDir, { recursive: true });

  const plistEntries = [
    ['CFBundleExecutable', 'App', 'string'],
  ];
  if (withAttPlist) {
    plistEntries.push(['NSUserTrackingUsageDescription', 'track', 'string']);
  }
  writeMinimalPlist(path.join(appDir, 'Info.plist'), plistEntries);

  writeFakeMachO(path.join(appDir, 'App'), `main-binary${execMarker ? `\n${execMarker}` : ''}`);

  if (attFrameworkPath) {
    fs.mkdirSync(
      path.join(appDir, 'Frameworks', 'AppTrackingTransparency.framework'),
      { recursive: true }
    );
  }

  if (withMetaFramework) {
    const fwDir = path.join(appDir, 'Frameworks', 'FBSDKCoreKit.framework');
    fs.mkdirSync(fwDir, { recursive: true });
    writeFakeMachO(path.join(fwDir, 'FBSDKCoreKit'), 'meta-sdk-binary');
  }

  if (nestedFrameworkMarker) {
    const fwDir = path.join(appDir, 'Frameworks', 'Evil.framework');
    fs.mkdirSync(fwDir, { recursive: true });
    writeFakeMachO(path.join(fwDir, 'Evil'), nestedFrameworkMarker);
  }

  if (privacyManifest) {
    const manifestDir = privacyManifest.dir
      ? path.join(appDir, privacyManifest.dir)
      : appDir;
    fs.mkdirSync(manifestDir, { recursive: true });
    fs.writeFileSync(path.join(manifestDir, 'PrivacyInfo.xcprivacy'), privacyManifest.xml);
  }

  if (withWidget) {
    const plugins = path.join(appDir, 'PlugIns');
    fs.mkdirSync(plugins, { recursive: true });
    fs.mkdirSync(path.join(plugins, 'WidgetRoutine.appex'));
  }

  return { archive, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

function hasOtool() {
  const r = spawnSync('which', ['otool'], { encoding: 'utf8' });
  return r.status === 0 && (r.stdout || '').trim().length > 0;
}

function hasStrings() {
  const r = spawnSync('which', ['strings'], { encoding: 'utf8' });
  return r.status === 0 && (r.stdout || '').trim().length > 0;
}

describe('verify-ios-archive-release', () => {
  it('passes clean fixture without widget or ATT (non-release mode)', () => {
    const { archive, cleanup } = makeFixtureArchive({
      privacyManifest: {
        xml: `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
<key>NSPrivacyTracking</key><false/>
<key>NSPrivacyTrackingDomains</key><array/>
</dict></plist>`,
      },
    });
    const r = runArchiveVerify(archive);
    cleanup();
    assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
    assert.match(r.stdout, /NO-TRACKING RELEASE GATE: PASS/);
    assert.match(r.stdout, /PRIVACY MANIFEST TRACKING SCAN: PASS/);
    assert.doesNotMatch(r.stdout, /FINAL ARCHIVE ATT FRAMEWORK: ABSENT/);
    assert.doesNotMatch(r.stdout, /FINAL ARCHIVE ATT API LINKAGE: ABSENT/);
    assert.doesNotMatch(r.stdout, /META ADVERTISER TRACKING: DISABLED/);
  });

  it('release mode fails when otool is unavailable', () => {
    if (hasOtool()) {
      return;
    }
    const { archive, cleanup } = makeFixtureArchive();
    const r = runArchiveVerify(archive, ['--release'], { CI_XCODEBUILD_ACTION: '' });
    cleanup();
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /otool is required for release archive verification/);
    assert.doesNotMatch(r.stdout, /NO-TRACKING RELEASE GATE: PASS/);
    assert.doesNotMatch(r.stdout, /ENTIRE APP BUNDLE ATT SCAN: PASS/);
  });

  it('release mode via CI_XCODEBUILD_ACTION=archive fails when otool is unavailable', () => {
    if (hasOtool()) {
      return;
    }
    const { archive, cleanup } = makeFixtureArchive();
    const r = runArchiveVerify(archive, [], { CI_XCODEBUILD_ACTION: 'archive' });
    cleanup();
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /otool is required for release archive verification/);
  });

  it('fails when NSUserTrackingUsageDescription is present', () => {
    const { archive, cleanup } = makeFixtureArchive({ withAttPlist: true });
    const r = runArchiveVerify(archive);
    cleanup();
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /NSUserTrackingUsageDescription/);
  });

  it('fails when WidgetRoutine.appex is packaged', () => {
    const { archive, cleanup } = makeFixtureArchive({ withWidget: true });
    const r = runArchiveVerify(archive);
    cleanup();
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /WidgetRoutine/);
  });

  it('fails when AppTrackingTransparency.framework path exists in Frameworks', () => {
    const { archive, cleanup } = makeFixtureArchive({ attFrameworkPath: true });
    const r = runArchiveVerify(archive);
    cleanup();
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /Forbidden ATT bundle path.*AppTrackingTransparency\.framework/);
  });

  it('fails when nested framework binary contains ATT API marker', () => {
    if (!hasStrings()) {
      return;
    }
    const { archive, cleanup } = makeFixtureArchive({
      nestedFrameworkMarker: 'ATTrackingManager',
    });
    const r = runArchiveVerify(archive);
    cleanup();
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /Frameworks\/Evil\.framework\/Evil: ATTrackingManager/);
  });

  it('fails when PrivacyInfo.xcprivacy declares NSPrivacyTracking=true', () => {
    const { archive, cleanup } = makeFixtureArchive({
      privacyManifest: {
        xml: `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
<key>NSPrivacyTracking</key><true/>
</dict></plist>`,
      },
    });
    const r = runArchiveVerify(archive);
    cleanup();
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /NSPrivacyTracking=true/);
  });

  it('fails when PrivacyInfo.xcprivacy declares NSPrivacyCollectedDataTypeTracking=true', () => {
    const { archive, cleanup } = makeFixtureArchive({
      privacyManifest: {
        dir: 'Frameworks/FBAEMKit.framework',
        xml: `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
<key>NSPrivacyTracking</key><false/>
<key>NSPrivacyCollectedDataTypes</key>
<array><dict>
<key>NSPrivacyCollectedDataTypeTracking</key><true/>
</dict></array>
</dict></plist>`,
      },
    });
    const r = runArchiveVerify(archive);
    cleanup();
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /NSPrivacyCollectedDataTypeTracking=true/);
  });

  it('fails when FBSDKCoreKit.framework is packaged', () => {
    const { archive, cleanup } = makeFixtureArchive({ withMetaFramework: true });
    const r = runArchiveVerify(archive);
    cleanup();
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /FBSDKCoreKit|Meta native SDK/i);
  });

  it('fails when PrivacyInfo.xcprivacy in FBSDKCoreKit declares tracking', () => {
    const { archive, cleanup } = makeFixtureArchive({
      privacyManifest: {
        dir: 'Frameworks/FBSDKCoreKit.framework',
        xml: `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
<key>NSPrivacyTracking</key><true/>
</dict></plist>`,
      },
    });
    const r = runArchiveVerify(archive);
    cleanup();
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /NSPrivacyTracking=true|Meta native SDK/i);
  });

  it('passes clean privacy manifest in non-Meta framework', () => {
    const { archive, cleanup } = makeFixtureArchive({
      privacyManifest: {
        dir: 'Frameworks/Capacitor.framework',
        xml: `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
<key>NSPrivacyTracking</key><false/>
<key>NSPrivacyTrackingDomains</key><array/>
<key>NSPrivacyCollectedDataTypes</key>
<array><dict>
<key>NSPrivacyCollectedDataTypeTracking</key><false/>
</dict></array>
</dict></plist>`,
      },
    });
    const r = runArchiveVerify(archive);
    cleanup();
    assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
    assert.match(r.stdout, /PRIVACY MANIFEST TRACKING SCAN: PASS/);
    assert.match(r.stdout, /IOS META NATIVE SDK: ABSENT/);
  });

  it('fails when main executable contains ATT API marker (strings available)', () => {
    if (!hasStrings()) {
      return;
    }
    const { archive, cleanup } = makeFixtureArchive({ execMarker: 'ATTrackingManager' });
    const r = runArchiveVerify(archive);
    cleanup();
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /App: ATTrackingManager/);
  });
});

describe('ios-xcode-cloud-pipeline archive gates', () => {
  it('ci_post_xcodebuild runs archive verifier on CI_ARCHIVE_PATH', () => {
    const sh = fs.readFileSync(path.join(ROOT, 'ios/App/ci_scripts/ci_post_xcodebuild.sh'), 'utf8');
    assert.match(sh, /ci_post_xcodebuild/);
    assert.match(sh, /CI_XCODEBUILD_ACTION/);
    assert.match(sh, /CI_ARCHIVE_PATH/);
    assert.match(sh, /verify-ios-archive-release\.mjs/);
  });

  it('iOS archive pipeline does not require META_CLIENT_TOKEN', () => {
    const post = fs.readFileSync(path.join(ROOT, 'ios/App/ci_scripts/ci_post_clone.sh'), 'utf8');
    const pre = fs.readFileSync(path.join(ROOT, 'ios/App/ci_scripts/ci_pre_xcodebuild.sh'), 'utf8');
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/lib/xcode-cloud-archive-gate.sh'), 'utf8');
    assert.match(post, /xcode-cloud-archive-gate\.sh/);
    assert.match(pre, /xcode-cloud-archive-gate\.sh/);
    assert.match(post, /verify-meta-native-release\.mjs --ios/);
    assert.match(pre, /verify-meta-native-release\.mjs --ios/);
    assert.match(pre, /patch-ios-xcode-cloud-build-number\.mjs/);
    assert.doesNotMatch(gate, /exit 1/);
    assert.doesNotMatch(post + pre, /META_CLIENT_TOKEN is required/);
  });

  it('cap:sync:ios still runs exactly once in post_clone', () => {
    const sh = fs.readFileSync(path.join(ROOT, 'ios/App/ci_scripts/ci_post_clone.sh'), 'utf8');
    const matches = sh.match(/cap:sync:ios/g) || [];
    assert.equal(matches.length, 1);
  });
});
