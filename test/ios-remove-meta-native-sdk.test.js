'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');

describe('iOS Meta privacy (no cross-app tracking / no native Meta SDK)', () => {
  const plistPath = path.join(ROOT, 'ios/App/App/Info.plist');
  const delegatePath = path.join(ROOT, 'ios/App/App/AppDelegate.swift');
  const coordinatorPath = path.join(ROOT, 'ios/App/App/AttTrackingCoordinator.swift');
  const podfilePath = path.join(ROOT, 'ios/App/Podfile');
  const pbxPath = path.join(ROOT, 'ios/App/App.xcodeproj/project.pbxproj');

  it('Info.plist does not declare NSUserTrackingUsageDescription or Facebook SDK keys', () => {
    const plist = fs.readFileSync(plistPath, 'utf8');
    assert.doesNotMatch(plist, /<key>NSUserTrackingUsageDescription<\/key>/);
    assert.doesNotMatch(plist, /<key>FacebookAppID<\/key>/);
    assert.doesNotMatch(plist, /<key>FacebookClientToken<\/key>/);
    assert.match(plist, /<key>SKAdNetworkItems<\/key>/);
  });

  it('AttTrackingCoordinator is removed from the iOS target', () => {
    assert.equal(fs.existsSync(coordinatorPath), false);
    const pbx = fs.readFileSync(pbxPath, 'utf8');
    assert.doesNotMatch(pbx, /AttTrackingCoordinator\.swift/);
  });

  it('AppDelegate is Capacitor-only without FBSDKCoreKit', () => {
    const delegate = fs.readFileSync(delegatePath, 'utf8');
    assert.doesNotMatch(delegate, /FBSDKCoreKit/);
    assert.doesNotMatch(delegate, /AttTrackingCoordinator/);
    assert.match(delegate, /ApplicationDelegateProxy\.shared/);
    assert.doesNotMatch(delegate, /requestTrackingAuthorization/);
  });

  it('Podfile has no CapacitorFacebookEvents pod', () => {
    const podfile = fs.readFileSync(podfilePath, 'utf8');
    assert.doesNotMatch(podfile, /CapacitorFacebookEvents/);
  });

  it('JS Meta layer never enables advertiser tracking and no-ops without plugin', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/meta-app-events.js'), 'utf8');
    assert.match(js, /advertiserTrackingAllowed = false/);
    assert.match(js, /does not perform Apple-defined cross-app tracking/);
    assert.match(js, /function isAttBlockingMeta\(\) \{\s*return false;/);
    assert.match(js, /FacebookEvents plugin unavailable — app continues without Meta/);
  });

  it('cap:sync:ios uses remove-meta-native patch instead of facebook-sdk patch', () => {
    const pkg = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
    assert.match(pkg, /patch-ios-remove-meta-native\.mjs/);
    assert.doesNotMatch(pkg, /patch-ios-facebook-sdk\.mjs/);
    assert.match(pkg, /patch-ios-skadnetwork\.mjs/);
    assert.match(pkg, /verify-ios-no-att-meta-release\.mjs/);
  });
});

describe('iOS remove Meta native SDK release gates', () => {
  it('verify-ios-no-att-meta-release passes on committed tree', () => {
    const r = spawnSync(process.execPath, ['scripts/verify-ios-no-att-meta-release.mjs'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
  });

  it('verify-meta-native-release --ios passes without META_CLIENT_TOKEN', () => {
    const r = spawnSync(
      process.execPath,
      ['scripts/verify-meta-native-release.mjs', '--ios'],
      { cwd: ROOT, encoding: 'utf8', env: { ...process.env, META_CLIENT_TOKEN: '' } }
    );
    assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
    assert.match(r.stdout, /no-Meta-native/i);
  });

  it('patch-ios-podfile strips CapacitorFacebookEvents if cap sync reintroduces it', () => {
    const podfilePath = path.join(ROOT, 'ios/App/Podfile');
    const original = fs.readFileSync(podfilePath, 'utf8');
    const poisoned = original.replace(
      "pod 'CapacitorPushNotifications'",
      "pod 'CapacitorFacebookEvents', :path => '../../node_modules/capacitor-facebook-events'\n  pod 'CapacitorPushNotifications'"
    );
    fs.writeFileSync(podfilePath, poisoned);
    try {
      const patch = spawnSync(process.execPath, ['scripts/patch-ios-podfile.mjs'], {
        cwd: ROOT,
        encoding: 'utf8',
      });
      assert.equal(patch.status, 0, patch.stderr || patch.stdout);
      const after = fs.readFileSync(podfilePath, 'utf8');
      assert.doesNotMatch(after, /CapacitorFacebookEvents/);
    } finally {
      fs.writeFileSync(podfilePath, original);
    }
  });

  it('capacitor.config.ts keeps capacitor-facebook-events on Android only', () => {
    const ts = fs.readFileSync(path.join(ROOT, 'capacitor.config.ts'), 'utf8');
    const iosBlock = ts.match(/ios:\s*\{[\s\S]*?includePlugins:\s*\[([\s\S]*?)\]/);
    assert.ok(iosBlock, 'ios includePlugins block');
    assert.doesNotMatch(iosBlock[1], /['"]capacitor-facebook-events['"]/);
    const androidBlock = ts.match(/android:\s*\{[\s\S]*?includePlugins:\s*\[([\s\S]*?)\]/);
    assert.ok(androidBlock, 'android includePlugins block');
    assert.match(androidBlock[1], /['"]capacitor-facebook-events['"]/);
  });
});
