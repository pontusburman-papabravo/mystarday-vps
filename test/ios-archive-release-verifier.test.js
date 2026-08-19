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

function makeFixtureArchive({ withWidget = false, withAttPlist = false, execMarker = '' } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xcarchive-'));
  const archive = path.join(dir, 'App.xcarchive');
  const appDir = path.join(archive, 'Products', 'Applications', 'App.app');
  fs.mkdirSync(appDir, { recursive: true });

  const plistEntries = [
    ['CFBundleExecutable', 'App', 'string'],
    ['FacebookAutoLogAppEventsEnabled', 'false', 'bool'],
    ['FacebookAdvertiserIDCollectionEnabled', 'false', 'bool'],
    ['FacebookClientToken', '12345678901234567890', 'string'],
  ];
  if (withAttPlist) {
    plistEntries.push(['NSUserTrackingUsageDescription', 'track', 'string']);
  }
  writeMinimalPlist(path.join(appDir, 'Info.plist'), plistEntries);

  const execPath = path.join(appDir, 'App');
  fs.writeFileSync(execPath, `main-binary${execMarker ? `\n${execMarker}` : ''}`);

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

describe('verify-ios-archive-release', () => {
  it('passes clean fixture without widget or ATT (non-release mode)', () => {
    const { archive, cleanup } = makeFixtureArchive();
    const r = runArchiveVerify(archive);
    cleanup();
    assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
    assert.match(r.stdout, /NO-TRACKING RELEASE GATE: PASS/);
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

  it('fails when executable contains ATT API marker (strings available)', () => {
    const stringsCheck = spawnSync('which', ['strings'], { encoding: 'utf8' });
    if (stringsCheck.status !== 0 || !(stringsCheck.stdout || '').trim()) {
      return;
    }
    const { archive, cleanup } = makeFixtureArchive({ execMarker: 'ATTrackingManager' });
    const r = runArchiveVerify(archive);
    cleanup();
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /ATT/);
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

  it('archive path requires META_CLIENT_TOKEN in post_clone and pre_xcodebuild', () => {
    const post = fs.readFileSync(path.join(ROOT, 'ios/App/ci_scripts/ci_post_clone.sh'), 'utf8');
    const pre = fs.readFileSync(path.join(ROOT, 'ios/App/ci_scripts/ci_pre_xcodebuild.sh'), 'utf8');
    assert.match(post, /xcode-cloud-archive-gate\.sh/);
    assert.match(pre, /xcode-cloud-archive-gate\.sh/);
    assert.match(post, /verify-meta-native-release\.mjs --ios/);
    assert.match(pre, /verify-meta-native-release\.mjs --ios/);
    assert.match(pre, /patch-ios-xcode-cloud-build-number\.mjs/);
    assert.doesNotMatch(post + pre, /META_CLIENT_TOKEN=/);
  });

  it('cap:sync:ios still runs exactly once in post_clone', () => {
    const sh = fs.readFileSync(path.join(ROOT, 'ios/App/ci_scripts/ci_post_clone.sh'), 'utf8');
    const matches = sh.match(/cap:sync:ios/g) || [];
    assert.equal(matches.length, 1);
  });
});
