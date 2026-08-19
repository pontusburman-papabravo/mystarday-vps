'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const PBX = path.join(ROOT, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
const PATCH = path.join(ROOT, 'scripts', 'patch-ios-widget-release-hold.mjs');
const VERIFY = path.join(ROOT, 'scripts', 'verify-ios-widget-release-hold.mjs');

describe('ios widget release hold', () => {
  let original;

  before(() => {
    original = fs.readFileSync(PBX, 'utf8');
  });

  after(() => {
    fs.writeFileSync(PBX, original);
  });

  it('normal release path does not embed WidgetRoutine in App target', () => {
    const pbx = fs.readFileSync(PBX, 'utf8');
    const appBlock = pbx.match(/504EC3031FED79650016851F \/\* App \*\/ = \{[\s\S]*?\n\t\t\};/);
    assert.ok(appBlock);
    assert.doesNotMatch(appBlock[0], /Embed Foundation Extensions/);
    assert.doesNotMatch(appBlock[0], /PBXTargetDependency/);
    assert.match(pbx, /R45D01011FED79650016851 \/\* WidgetRoutine \*\/ =/);
  });

  it('verify-ios-widget-release-hold passes on committed project', () => {
    const r = spawnSync(process.execPath, [VERIFY], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
  });

  it('cap:sync:ios chain includes release-hold patch and verifier', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const chain = pkg.scripts['cap:sync:ios'];
    const holdIdx = chain.indexOf('patch-ios-widget-release-hold.mjs');
    const extIdx = chain.indexOf('patch-ios-widget-extension.mjs');
    const verifyIdx = chain.indexOf('verify-ios-widget-release-hold.mjs');
    assert.ok(extIdx > -1 && holdIdx > extIdx, 'release-hold runs after widget extension patch');
    assert.ok(verifyIdx > holdIdx, 'verifier runs after release-hold');
  });

  it('patch removes embed after extension patch reintroduces it', () => {
    const poisoned = original.replace(
      '504EC3021FED79650016851F /* Resources */,',
      '504EC3021FED79650016851F /* Resources */,\n\t\t\t\tR45D01051FED79650016851 /* Embed Foundation Extensions */,'
    ).replace(
      'dependencies = (\n\t\t\t);',
      'dependencies = (\n\t\t\t\tR45D01061FED79650016851 /* PBXTargetDependency */,\n\t\t\t);'
    );
    fs.writeFileSync(PBX, poisoned);
    const r = spawnSync(process.execPath, [PATCH], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
    const updated = fs.readFileSync(PBX, 'utf8');
    const appBlock = updated.match(/504EC3031FED79650016851F \/\* App \*\/ = \{[\s\S]*?\n\t\t\};/);
    assert.ok(appBlock);
    assert.doesNotMatch(appBlock[0], /Embed Foundation Extensions/);
  });
});
