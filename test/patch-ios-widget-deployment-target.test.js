'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const PBX = path.join(ROOT, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
const PATCH = path.join(ROOT, 'scripts', 'patch-ios-widget-deployment-target.mjs');

describe('patch-ios-widget-deployment-target', () => {
  let original;

  before(() => {
    original = fs.readFileSync(PBX, 'utf8');
  });

  after(() => {
    fs.writeFileSync(PBX, original);
  });

  it('is idempotent when WidgetRoutine is already iOS 17.0 (Xcode Cloud cap:sync:ios)', () => {
    assert.match(original, /INFOPLIST_FILE = WidgetRoutine\/Info\.plist;/);
    assert.match(original, /IPHONEOS_DEPLOYMENT_TARGET = 17\.0;/);
    const r = spawnSync(process.execPath, [PATCH], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
    assert.match(r.stdout + r.stderr, /already at iOS 17\.0/);
    assert.equal(fs.readFileSync(PBX, 'utf8'), original);
  });

  it('patches WidgetRoutine configs still on iOS 14.0', () => {
    const poisoned = original.replace(
      /(INFOPLIST_FILE = WidgetRoutine\/Info\.plist;\n\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = )17\.0;/g,
      '$114.0;'
    );
    assert.notEqual(poisoned, original);
    fs.writeFileSync(PBX, poisoned);
    const r = spawnSync(process.execPath, [PATCH], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
    const updated = fs.readFileSync(PBX, 'utf8');
    assert.match(
      updated,
      /INFOPLIST_FILE = WidgetRoutine\/Info\.plist;\n\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17\.0;/
    );
  });
});
