'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('iOS Meta privacy (no cross-app tracking / no ATT)', () => {
  const plistPath = path.join(ROOT, 'ios/App/App/Info.plist');
  const delegatePath = path.join(ROOT, 'ios/App/App/AppDelegate.swift');
  const coordinatorPath = path.join(ROOT, 'ios/App/App/AttTrackingCoordinator.swift');
  const pbxPath = path.join(ROOT, 'ios/App/App.xcodeproj/project.pbxproj');

  it('Info.plist does not declare NSUserTrackingUsageDescription', () => {
    const plist = fs.readFileSync(plistPath, 'utf8');
    assert.doesNotMatch(plist, /<key>NSUserTrackingUsageDescription<\/key>/);
  });

  it('AttTrackingCoordinator does not import AppTrackingTransparency', () => {
    const swift = fs.readFileSync(coordinatorPath, 'utf8');
    assert.doesNotMatch(swift, /import AppTrackingTransparency/);
    assert.doesNotMatch(swift, /requestTrackingAuthorization/);
    assert.match(swift, /isAdvertiserIDCollectionEnabled = false/);
    assert.match(swift, /isAdvertiserTrackingEnabled = false/);
  });

  it('AttTrackingCoordinator is compiled into the App target', () => {
    const pbx = fs.readFileSync(pbxPath, 'utf8');
    assert.match(pbx, /AttTrackingCoordinator\.swift in Sources/);
  });

  it('AppDelegate applies Meta privacy defaults without ATT prompt', () => {
    const delegate = fs.readFileSync(delegatePath, 'utf8');
    assert.match(delegate, /AttTrackingCoordinator\.shared\.applyStartupPrivacyDefaults/);
    assert.match(delegate, /applyMetaSettingsForCurrentAttStatus/);
    assert.doesNotMatch(delegate, /requestTrackingAuthorization/);
  });

  it('JS Meta layer never enables advertiser tracking', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/meta-app-events.js'), 'utf8');
    assert.match(js, /advertiserTrackingAllowed = false/);
    assert.match(js, /does not perform Apple-defined cross-app tracking/);
    assert.match(js, /function isAttBlockingMeta\(\) \{\s*return false;/);
  });

  it('patch-ios-facebook-sdk strips ATT usage string instead of adding it', () => {
    const patch = fs.readFileSync(path.join(ROOT, 'scripts/patch-ios-facebook-sdk.mjs'), 'utf8');
    assert.doesNotMatch(patch, /CapacitorPluginAppTrackingTransparency/);
    assert.match(patch, /NSUserTrackingUsageDescription/);
    assert.doesNotMatch(patch, /upsertPlistKey\(\s*\n\s*content,\s*\n\s*'NSUserTrackingUsageDescription'/);
  });

  it('cap:sync:ios chain includes SKAdNetwork patch and no-ATT verify', () => {
    const pkg = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
    assert.match(pkg, /patch-ios-skadnetwork\.mjs/);
    assert.match(pkg, /verify-ios-no-att-meta-release\.mjs/);
  });
});
