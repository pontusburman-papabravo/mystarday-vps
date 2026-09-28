'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'verify-ios-archive-release-tag.mjs');

const UNTAGGED_HEAD = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const TAGGED_HEAD = '119b61c17ce25a69b315e9d9737d0d1c06943381';
const OTHER_HEAD = '708e1195537003a3ecea4e6d2ca81bef18c85833';
const ANNOTATED_TAG_OBJECT = 'e8ceb68b254fdb3398f01028ca49ef08fc82427f';

const TAGGED_LS_REMOTE = [
  `${OTHER_HEAD}\trefs/tags/ios-v1.4.6`,
  `${ANNOTATED_TAG_OBJECT}\trefs/tags/ios-v1.4.6-r2`,
  `${TAGGED_HEAD}\trefs/tags/ios-v1.4.6-r2^{}`,
].join('\n');

function run(extraEnv = {}) {
  return spawnSync(process.execPath, [SCRIPT], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      IOS_ARCHIVE_HEAD_SHA: UNTAGGED_HEAD,
      IOS_ARCHIVE_LS_REMOTE: '',
      ...extraEnv,
    },
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

  it('allows archive when CI_TAG is a full refs/tags/ios-v* value', () => {
    const r = run({
      CI_XCODEBUILD_ACTION: 'archive',
      CI_TAG: 'refs/tags/ios-v1.4.6-r2',
      CI_GIT_REF: 'refs/heads/main',
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

  it('allows main-workflow archive when a lightweight ios-v* tag points at HEAD', () => {
    const r = run({
      CI_XCODEBUILD_ACTION: 'archive',
      CI_BRANCH: 'main',
      CI_TAG: '',
      CI_GIT_REF: 'refs/heads/main',
      IOS_ARCHIVE_HEAD_SHA: OTHER_HEAD,
      IOS_ARCHIVE_LS_REMOTE: `${OTHER_HEAD}\trefs/tags/ios-v1.4.6\n`,
    });
    assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
    assert.match(r.stdout, /ios-v1\.4\.6/);
  });

  it('allows main-workflow archive when origin ios-v* tag points at HEAD', () => {
    const r = run({
      CI_XCODEBUILD_ACTION: 'archive',
      CI_BRANCH: 'main',
      CI_TAG: '',
      CI_GIT_REF: 'refs/heads/main',
      IOS_ALLOW_STORE_ARCHIVE: '',
      IOS_ARCHIVE_HEAD_SHA: TAGGED_HEAD,
      IOS_ARCHIVE_LS_REMOTE: TAGGED_LS_REMOTE,
    });
    assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
    assert.match(r.stdout, /ios-v1\.4\.6-r2/);
    assert.match(r.stdout, /PASS: archive allowed/);
  });

  it('refuses main-workflow archive when the ios-v* tag points at another commit', () => {
    const r = run({
      CI_XCODEBUILD_ACTION: 'archive',
      CI_BRANCH: 'main',
      CI_TAG: '',
      CI_GIT_REF: 'refs/heads/main',
      IOS_ARCHIVE_HEAD_SHA: UNTAGGED_HEAD,
      IOS_ARCHIVE_LS_REMOTE: TAGGED_LS_REMOTE,
    });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /archive refused without ios-v/);
  });

  it('does not treat an annotated tag object SHA as HEAD', () => {
    const r = run({
      CI_XCODEBUILD_ACTION: 'archive',
      CI_BRANCH: 'main',
      CI_TAG: '',
      CI_GIT_REF: 'refs/heads/main',
      IOS_ARCHIVE_HEAD_SHA: ANNOTATED_TAG_OBJECT,
      IOS_ARCHIVE_LS_REMOTE: TAGGED_LS_REMOTE,
    });
    assert.notEqual(r.status, 0);
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
    assert.match(post, /CI_TAG=\$\{CI_TAG:-empty\}/);
  });
});
