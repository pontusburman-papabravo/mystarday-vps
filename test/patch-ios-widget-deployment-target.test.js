'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('node:child_process');
const { withPbxLock } = require('./helpers/pbxproj-test-lock');

const ROOT = path.join(__dirname, '..');
const PBX = path.join(ROOT, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
const PATCH = path.join(ROOT, 'scripts', 'patch-ios-widget-deployment-target.mjs');

describe('patch-ios-widget-deployment-target', () => {
  it('is idempotent when WidgetRoutine is already iOS 17.0 (Xcode Cloud cap:sync:ios)', () => {
    withPbxLock(() => {
      const original = fs.readFileSync(PBX, 'utf8');
      assert.match(original, /INFOPLIST_FILE = WidgetRoutine\/Info\.plist;/);
      assert.match(original, /IPHONEOS_DEPLOYMENT_TARGET = 17\.0;/);
      const r = spawnSync(process.execPath, [PATCH], { cwd: ROOT, encoding: 'utf8' });
      assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
      assert.match(r.stdout + r.stderr, /already at iOS 17\.0/);
      assert.equal(fs.readFileSync(PBX, 'utf8'), original);
    });
  });

  it('patches WidgetRoutine configs still on iOS 14.0', () => {
    withPbxLock(() => {
      const original = fs.readFileSync(PBX, 'utf8');
      const poisoned = original.replace(
        /(INFOPLIST_FILE = WidgetRoutine\/Info\.plist;\n\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = )17\.0;/g,
        '$114.0;'
      );
      assert.notEqual(poisoned, original);
      try {
        fs.writeFileSync(PBX, poisoned);
        const r = spawnSync(process.execPath, [PATCH], { cwd: ROOT, encoding: 'utf8' });
        assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
        const updated = fs.readFileSync(PBX, 'utf8');
        assert.match(
          updated,
          /INFOPLIST_FILE = WidgetRoutine\/Info\.plist;\n\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17\.0;/
        );
      } finally {
        fs.writeFileSync(PBX, original);
      }
    });
  });

  it('every shared project.pbxproj writer holds the test lock', () => {
    const files = [];
    function walk(dir) {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) walk(full);
        else if (ent.name.endsWith('.js')) files.push(full);
      }
    }
    walk(path.join(ROOT, 'test'));
    const writers = files.filter((file) => {
      const src = fs.readFileSync(file, 'utf8');
      return /writeFileSync\(\s*PBX\b/.test(src) || /writeFileSync\(\s*PBXPROJ\b/.test(src);
    });
    assert.ok(writers.length >= 3, 'expected the known shared pbxproj writers');
    for (const file of writers) {
      const src = fs.readFileSync(file, 'utf8');
      assert.match(src, /withPbxLock\(/, path.relative(ROOT, file));
    }
    const version = fs.readFileSync(path.join(ROOT, 'test/ios-xcode-cloud-version.test.js'), 'utf8');
    assert.doesNotMatch(version, /writeFileSync\(\s*PBX\b/);
  });
});
