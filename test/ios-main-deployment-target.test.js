'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const PBX = path.join(ROOT, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
const PATCH = path.join(ROOT, 'scripts', 'patch-ios-main-deployment-target.mjs');

describe('patch-ios-main-deployment-target', () => {
  it('main App and project configs use iOS 15.0', () => {
    const pbx = fs.readFileSync(PBX, 'utf8');
    assert.doesNotMatch(pbx, /IPHONEOS_DEPLOYMENT_TARGET = 14\.0;/);
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
  });

  it('patch script is idempotent at iOS 15.0', () => {
    const r = spawnSync(process.execPath, [PATCH], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
    assert.match(r.stdout + r.stderr, /already at iOS 15\.0/);
  });
});
