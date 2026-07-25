'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('iOS ATT tracking (App Store Guideline 2.1)', () => {
  const plistPath = path.join(ROOT, 'ios/App/App/Info.plist');
  const delegatePath = path.join(ROOT, 'ios/App/App/AppDelegate.swift');
  const coordinatorPath = path.join(ROOT, 'ios/App/App/AttTrackingCoordinator.swift');
  const pbxPath = path.join(ROOT, 'ios/App/App.xcodeproj/project.pbxproj');
  const stringsPath = path.join(ROOT, 'ios/App/App/sv.lproj/InfoPlist.strings');

  it('Info.plist contains required NSUserTrackingUsageDescription', () => {
    const plist = fs.readFileSync(plistPath, 'utf8');
    assert.match(plist, /<key>NSUserTrackingUsageDescription<\/key>/);
    assert.match(plist, /Din tillåtelse hjälper oss att mäta vilka annonser/);
    assert.match(plist, /installeras och används/);
  });

  it('Swedish InfoPlist.strings localizes ATT description', () => {
    const strings = fs.readFileSync(stringsPath, 'utf8');
    assert.match(strings, /NSUserTrackingUsageDescription/);
    assert.match(strings, /Din tillåtelse hjälper oss att mäta vilka annonser/);
  });

  it('AttTrackingCoordinator is compiled into the App target', () => {
    const pbx = fs.readFileSync(pbxPath, 'utf8');
    assert.match(pbx, /AttTrackingCoordinator\.swift in Sources/);
    assert.ok(fs.existsSync(coordinatorPath));
  });

  it('native coordinator gates Meta until ATT resolves', () => {
    const swift = fs.readFileSync(coordinatorPath, 'utf8');
    assert.match(swift, /iOS 14\.5/);
    assert.match(swift, /trackingAuthorizationStatus == \.notDetermined/);
    assert.match(swift, /application\.applicationState == \.active/);
    assert.match(swift, /presentationViewController/);
    assert.match(swift, /isAdvertiserTrackingEnabled = false/);
    assert.match(swift, /requestTrackingAuthorization/);
    assert.match(swift, /#if DEBUG/);
    assert.match(swift, /\[MSD_ATT\]/);
  });

  it('AppDelegate delegates ATT to coordinator and gates activateApp', () => {
    const delegate = fs.readFileSync(delegatePath, 'utf8');
    assert.match(delegate, /AttTrackingCoordinator\.shared\.applyStartupPrivacyDefaults/);
    assert.match(delegate, /AttTrackingCoordinator\.shared\.schedulePromptIfNeeded/);
    assert.match(delegate, /AttTrackingCoordinator\.shared\.applicationDidEnterBackground/);
    assert.doesNotMatch(delegate, /import AppTrackingTransparency/);

    const becomeActive = delegate.slice(
      delegate.indexOf('func applicationDidBecomeActive'),
      delegate.indexOf('func applicationWillTerminate')
    );
    assert.match(becomeActive, /isAutoLogAppEventsEnabled/);
    assert.equal((becomeActive.match(/activateApp\(\)/g) || []).length, 1);
  });

  it('no SceneDelegate bypasses ATT flow', () => {
    const sceneDelegate = path.join(ROOT, 'ios/App/App/SceneDelegate.swift');
    assert.equal(fs.existsSync(sceneDelegate), false);
  });

  it('JS blocks Meta events until ATT is resolved on iOS', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/meta-app-events.js'), 'utf8');
    assert.match(js, /isAttBlockingMeta/);
    assert.match(js, /skip: ATT not resolved/);
    assert.match(js, /attBlocksMeta/);
    assert.match(js, /att_status/);
    assert.match(js, /att_request_attempted/);
    assert.match(js, /att_request_completed/);
  });

  it('patch script preserves ATT description and coordinator AppDelegate', () => {
    const patch = fs.readFileSync(path.join(ROOT, 'scripts/patch-ios-facebook-sdk.mjs'), 'utf8');
    assert.match(patch, /Din tillåtelse hjälper oss att mäta vilka annonser/);
    assert.match(patch, /AttTrackingCoordinator\.shared/);
  });
});
