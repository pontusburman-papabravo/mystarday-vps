'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const VERIFY = path.join(ROOT, 'scripts', 'verify-ios-closed-marketing-train.mjs');
const PBX = path.join(ROOT, 'ios/App/App.xcodeproj/project.pbxproj');

function runVerify(extraEnv = {}) {
  return spawnSync(process.execPath, [VERIFY], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...extraEnv },
  });
}

describe('verify-ios-closed-marketing-train', () => {
  it('passes on the committed project (next train is open)', () => {
    const r = runVerify();
    assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
    assert.match(r.stdout, /PASS: MARKETING_VERSION/);
  });

  it('fails when MARKETING_VERSION matches a closed train', () => {
    const original = fs.readFileSync(PBX, 'utf8');
    const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ios-closed-train-'));
    const fixturePbx = path.join(fixtureDir, 'project.pbxproj');
    fs.writeFileSync(fixturePbx, original.replace(/MARKETING_VERSION = [\d.]+;/g, 'MARKETING_VERSION = 1.4.4;'));
    try {
      const r = runVerify({ IOS_XCODE_PROJECT_PATH: fixturePbx });
      assert.notEqual(r.status, 0);
      assert.match(r.stderr + r.stdout, /ITMS-90186|closed/);
    } finally {
      fs.rmSync(fixtureDir, { recursive: true, force: true });
    }
  });

  it('ci_pre_xcodebuild runs the closed-train verifier before archive', () => {
    const sh = fs.readFileSync(path.join(ROOT, 'ios/App/ci_scripts/ci_pre_xcodebuild.sh'), 'utf8');
    const verifyIdx = sh.indexOf('verify-ios-closed-marketing-train.mjs');
    const archiveIdx = sh.indexOf('CI_XCODEBUILD_ACTION');
    assert.ok(verifyIdx > -1, 'closed-train verifier is wired');
    assert.ok(archiveIdx > verifyIdx, 'closed-train check runs before archive-only steps');
  });
});
