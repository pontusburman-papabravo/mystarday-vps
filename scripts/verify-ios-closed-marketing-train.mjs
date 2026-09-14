#!/usr/bin/env node
/**
 * Fail if iOS MARKETING_VERSION (CFBundleShortVersionString) is on a closed
 * App Store train (ITMS-90186 / ITMS-90062).
 *
 * Closed trains: config/release-compliance-gate.json
 *   versionSources.closedIosMarketingVersions
 *
 * Override project path for tests: IOS_XCODE_PROJECT_PATH
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { closedIosTrainStatus } = require('./lib/release-compliance/check-version-build-cache.cjs');
const { loadReleaseComplianceConfig } = require('./lib/release-compliance/load-config.cjs');
const { STATUS } = require('./lib/release-compliance/constants.cjs');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = loadReleaseComplianceConfig(ROOT, { fresh: true });
const pbxPath =
  process.env.IOS_XCODE_PROJECT_PATH ||
  path.join(ROOT, config.versionSources?.iosProjectFile || 'ios/App/App.xcodeproj/project.pbxproj');

if (!fs.existsSync(pbxPath)) {
  console.error(`[verify-ios-closed-marketing-train] FAIL: project not found at ${pbxPath}`);
  process.exit(1);
}

const pbx = fs.readFileSync(pbxPath, 'utf8');
const found = [...pbx.matchAll(/MARKETING_VERSION = ([\d.]+);/g)].map((m) => m[1]);
const unique = [...new Set(found)];

if (unique.length !== 1) {
  console.error(
    `[verify-ios-closed-marketing-train] FAIL: inconsistent or missing MARKETING_VERSION: ${unique.join(', ') || '(none)'}`
  );
  process.exit(1);
}

const result = closedIosTrainStatus(unique[0], config.versionSources?.closedIosMarketingVersions);
if (result.status === STATUS.FAIL) {
  console.error(
    `[verify-ios-closed-marketing-train] FAIL: MARKETING_VERSION ${result.marketingVersion} is closed or not higher than ${result.highestClosed} (ITMS-90186 / ITMS-90062). Bump with: npm run ios:xcode-cloud:version -- <next>`
  );
  process.exit(1);
}

console.log(
  `[verify-ios-closed-marketing-train] PASS: MARKETING_VERSION ${result.marketingVersion} > closed ${result.highestClosed}`
);
