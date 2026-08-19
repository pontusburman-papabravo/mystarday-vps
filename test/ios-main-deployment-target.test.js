'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const PBX = path.join(ROOT, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
const PODFILE = path.join(ROOT, 'ios', 'App', 'Podfile');
const PATCH = path.join(ROOT, 'scripts', 'patch-ios-main-deployment-target.mjs');
const PODFILE_PATCH = path.join(ROOT, 'scripts', 'patch-ios-podfile.mjs');

describe('patch-ios-main-deployment-target', () => {
  it('main App, Podfile platform, and WidgetRoutine deployment targets', () => {
    const pbx = fs.readFileSync(PBX, 'utf8');
    const podfile = fs.readFileSync(PODFILE, 'utf8');
    assert.doesNotMatch(pbx, /IPHONEOS_DEPLOYMENT_TARGET = 14\.0;/);
    assert.match(podfile, /^platform :ios, '15\.0'/m);
    assert.doesNotMatch(podfile, /platform :ios, '14\.0'/);
    const appDebug = pbx.match(
      /504EC3171FED79650016851F \/\* Debug \*\/ = \{[\s\S]*?buildSettings = \{([\s\S]*?)\n\t\t\t\};/
    );
    const appRelease = pbx.match(
      /504EC3181FED79650016851F \/\* Release \*\/ = \{[\s\S]*?buildSettings = \{([\s\S]*?)\n\t\t\t\};/
    );
    assert.ok(appDebug, 'App Debug config');
    assert.ok(appRelease, 'App Release config');
    assert.match(appDebug[1], /IPHONEOS_DEPLOYMENT_TARGET = 15\.0;/);
    assert.match(appRelease[1], /IPHONEOS_DEPLOYMENT_TARGET = 15\.0;/);
    assert.match(pbx, /IPHONEOS_DEPLOYMENT_TARGET = 15\.0;/);
    const widgetBlocks = [...pbx.matchAll(
      /INFOPLIST_FILE = WidgetRoutine\/Info\.plist;\n\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = ([\d.]+);/g
    )];
    assert.equal(widgetBlocks.length, 2, 'WidgetRoutine Debug + Release');
    for (const block of widgetBlocks) {
      assert.equal(block[1], '17.0');
    }
  });

  it('patch-ios-podfile keeps Podfile platform at iOS 15.0', () => {
    const patchSrc = fs.readFileSync(PODFILE_PATCH, 'utf8');
    assert.match(patchSrc, /PODFILE_PLATFORM = '15\.0'/);
    const r = spawnSync(process.execPath, [PODFILE_PATCH], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
    const podfile = fs.readFileSync(PODFILE, 'utf8');
    assert.match(podfile, /^platform :ios, '15\.0'/m);
  });

  it('patch script is idempotent at iOS 15.0', () => {
    const r = spawnSync(process.execPath, [PATCH], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
    assert.match(r.stdout + r.stderr, /already at iOS 15\.0/);
  });
});
