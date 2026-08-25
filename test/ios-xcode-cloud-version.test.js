'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('node:child_process');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'ios-xcode-cloud-version.mjs');
const PBX = path.join(ROOT, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');

function runVersion(version, extraEnv = {}) {
  return spawnSync(process.execPath, [SCRIPT, version], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...extraEnv },
  });
}

describe('ios-xcode-cloud-version', () => {
  let original;
  let fixturePbx;
  let fixtureDir;

  before(() => {
    original = fs.readFileSync(PBX, 'utf8');
    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ios-version-'));
    fixturePbx = path.join(fixtureDir, 'project.pbxproj');
    fs.writeFileSync(fixturePbx, original);
  });

  after(() => {
    fs.writeFileSync(PBX, original);
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('updates MARKETING_VERSION for valid version', () => {
    fs.writeFileSync(fixturePbx, original);
    const env = { IOS_XCODE_PROJECT_PATH: fixturePbx };
    const r = runVersion('2.0.1', env);
    assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
    const updated = fs.readFileSync(fixturePbx, 'utf8');
    assert.match(updated, /MARKETING_VERSION = 2\.0\.1;/g);
    assert.doesNotMatch(updated, /MARKETING_VERSION = 1\.4\.3;/);
  });

  it('rejects malformed version', () => {
    const r = runVersion('1.4-beta', { IOS_XCODE_PROJECT_PATH: fixturePbx });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /malformed/);
  });

  it('fails on inconsistent marketing versions', () => {
    const bad = original.replace('MARKETING_VERSION = 1.4.3;', 'MARKETING_VERSION = 9.9;', 1);
    const badPath = path.join(fixtureDir, 'bad.pbxproj');
    fs.writeFileSync(badPath, bad);
    const r = runVersion('1.4.3', { IOS_XCODE_PROJECT_PATH: badPath });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /inconsistent/);
  });

  it('same version is successful no-op', () => {
    fs.writeFileSync(fixturePbx, original);
    const env = { IOS_XCODE_PROJECT_PATH: fixturePbx };
    const r = runVersion('1.4.3', env);
    assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
    assert.match(r.stdout, /already 1\.4\.3/);
  });

  it('does not modify CURRENT_PROJECT_VERSION', () => {
    const before = fs.readFileSync(PBX, 'utf8');
    const env = { IOS_XCODE_PROJECT_PATH: fixturePbx };
    runVersion('1.5', env);
    const afterFixture = fs.readFileSync(fixturePbx, 'utf8');
    const beforeBuild = [...before.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g)].map((m) => m[1]);
    const afterBuild = [...afterFixture.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g)].map((m) => m[1]);
    assert.deepEqual(afterBuild, beforeBuild);
  });
});
