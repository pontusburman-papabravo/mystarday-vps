#!/usr/bin/env node
/**
 * Refuse Xcode Cloud archives unless the workflow was started by an ios-v* tag.
 *
 * Stops accidental App Store Connect / TestFlight deliveries (and the ITMS
 * emails they produce) when Xcode Cloud is set to archive on every main change.
 * Web/Capacitor deploys do not need an IPA.
 *
 * Override for a one-off archive without a tag: IOS_ALLOW_STORE_ARCHIVE=1
 * (do not set this in the standing Xcode Cloud workflow).
 */
const action = String(process.env.CI_XCODEBUILD_ACTION || '').trim();
if (action !== 'archive') {
  console.log('[verify-ios-archive-release-tag] skip: not an archive');
  process.exit(0);
}

if (String(process.env.IOS_ALLOW_STORE_ARCHIVE || '').trim() === '1') {
  console.log(
    '[verify-ios-archive-release-tag] PASS: IOS_ALLOW_STORE_ARCHIVE=1 (explicit override)'
  );
  process.exit(0);
}

const tag = String(process.env.CI_TAG || '').trim();
const ref = String(process.env.CI_GIT_REF || '').trim();
const allowed = /^ios-v\d/.test(tag) || /^refs\/tags\/ios-v\d/.test(ref);

if (!allowed) {
  console.error(
    `[verify-ios-archive-release-tag] FAIL: archive refused without ios-v* tag ` +
      `(CI_TAG=${tag || '(empty)'} CI_GIT_REF=${ref || '(empty)'} CI_BRANCH=${process.env.CI_BRANCH || '(empty)'}). ` +
      `Founder freeze: no App Store/TestFlight delivery until an ios-v* tag. ` +
      `Web deploys do not need an IPA.`
  );
  process.exit(1);
}

console.log(`[verify-ios-archive-release-tag] PASS: archive allowed for ${tag || ref}`);
