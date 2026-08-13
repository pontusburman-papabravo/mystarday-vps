'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

test('ci_post_clone runs cap:sync:ios once with stage logging helper', () => {
  const sh = fs.readFileSync(path.join(ROOT, 'ios/App/ci_scripts/ci_post_clone.sh'), 'utf8');
  assert.match(sh, /xcode-cloud-stage\.sh/);
  assert.match(sh, /cap:sync:ios/);
  assert.doesNotMatch(sh, /ci_pre_xcodebuild/);
  assert.match(sh, /brew --prefix node@20/);
  assert.match(sh, /npm ci --legacy-peer-deps --include=dev/);
});

test('ci_pre_xcodebuild does not re-run cap:sync:ios (idempotent with post_clone)', () => {
  const sh = fs.readFileSync(path.join(ROOT, 'ios/App/ci_scripts/ci_pre_xcodebuild.sh'), 'utf8');
  assert.match(sh, /prepare-ios-native\.mjs/);
  assert.match(sh, /pod install/);
  assert.doesNotMatch(sh, /xcode_cloud_npm cap_sync_ios|npm run cap:sync:ios|run cap:sync:ios/);
  assert.match(sh, /verify-ios-apple-sign-in-patch\.mjs/);
  assert.match(sh, /verify-ios-no-google-pods\.mjs/);
});

test('cap:sync:ios includes widget deployment target patch before verify steps', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const chain = pkg.scripts['cap:sync:ios'];
  const deployIdx = chain.indexOf('patch-ios-widget-deployment-target.mjs');
  const verifyIdx = chain.indexOf('verify-ios-widget-extension.mjs');
  assert.ok(deployIdx > -1, 'deployment patch in chain');
  assert.ok(verifyIdx > deployIdx, 'deployment patch runs before widget verify');
});

test('xcode-cloud stage helper never echoes secret env vars', () => {
  const sh = fs.readFileSync(path.join(ROOT, 'scripts/lib/xcode-cloud-stage.sh'), 'utf8');
  assert.doesNotMatch(sh, /JWT_SECRET|META_CLIENT_TOKEN|PASSWORD|TOKEN=/i);
  assert.match(sh, /category=/);
  assert.match(sh, /exit=\$\{exit_code\}/);
});
