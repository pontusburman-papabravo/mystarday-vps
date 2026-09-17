'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'verify-ios-archive-release-tag.mjs');

function run(extraEnv = {}) {
  return spawnSync(process.execPath, [SCRIPT], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...extraEnv },
  });
}

describe('verify-ios-archive-release-tag', () => {
  it('skips when not an archive', () => {
    const r = run({ CI_XCODEBUILD_ACTION: 'build', CI_BRANCH: 'main' });
    assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
    assert.match(r.stdout, /skip: not an archive/);
  });

  it('refuses archive from a branch with no ios-v tag', () => {
    const r = run({
      CI_XCODEBUILD_ACTION: 'archive',
      CI_BRANCH: 'main',
      CI_TAG: '',
      CI_GIT_REF: 'refs/heads/main',
      IOS_ALLOW_STORE_ARCHIVE: '',
    });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /archive refused without ios-v/);
  });

  it('allows archive for ios-v* CI_TAG', () => {
    const r = run({
      CI_XCODEBUILD_ACTION: 'archive',
      CI_TAG: 'ios-v1.4.6',
      CI_GIT_REF: 'refs/tags/ios-v1.4.6',
    });
    assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
    assert.match(r.stdout, /PASS: archive allowed/);
  });

  it('allows archive when CI_GIT_REF is an ios-v* tag', () => {
    const r = run({
      CI_XCODEBUILD_ACTION: 'archive',
      CI_TAG: '',
      CI_GIT_REF: 'refs/tags/ios-v1.4.6',
    });
    assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
  });

  it('allows explicit override IOS_ALLOW_STORE_ARCHIVE=1', () => {
    const r = run({
      CI_XCODEBUILD_ACTION: 'archive',
      CI_BRANCH: 'main',
      CI_TAG: '',
      CI_GIT_REF: 'refs/heads/main',
      IOS_ALLOW_STORE_ARCHIVE: '1',
    });
    assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
    assert.match(r.stdout, /IOS_ALLOW_STORE_ARCHIVE=1/);
  });

  it('ci_pre_xcodebuild and ci_post_clone run the tag freeze before archive work', () => {
    const pre = fs.readFileSync(path.join(ROOT, 'ios/App/ci_scripts/ci_pre_xcodebuild.sh'), 'utf8');
    const post = fs.readFileSync(path.join(ROOT, 'ios/App/ci_scripts/ci_post_clone.sh'), 'utf8');
    const preIdx = pre.indexOf('verify-ios-archive-release-tag.mjs');
    const preArchiveIdx = pre.indexOf('patch-ios-xcode-cloud-build-number.mjs');
    const postIdx = post.indexOf('verify-ios-archive-release-tag.mjs');
    const postNpmIdx = post.indexOf('npm ci');
    assert.ok(preIdx > -1, 'pre_xcodebuild runs tag freeze');
    assert.ok(preIdx < preArchiveIdx, 'tag freeze runs before build-number patch');
    assert.ok(postIdx > -1, 'post_clone runs tag freeze');
    assert.ok(postIdx < postNpmIdx, 'tag freeze runs before npm ci on archive workflows');
  });
});
