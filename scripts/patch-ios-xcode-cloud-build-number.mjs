#!/usr/bin/env node
/**
 * Apply Xcode Cloud CI_BUILD_NUMBER to CURRENT_PROJECT_VERSION before archive.
 * Only runs when CI_BUILD_NUMBER is set (Xcode Cloud). Does not change committed defaults locally.
 */
import fs from 'fs';
import path from 'path';

const buildNumber = String(process.env.CI_BUILD_NUMBER || '').trim();
const pbxPath = path.join(process.cwd(), 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');

if (!buildNumber) {
  console.log('[xcode-cloud-build-number] CI_BUILD_NUMBER unset — keeping committed CURRENT_PROJECT_VERSION');
  process.exit(0);
}

if (!/^\d+$/.test(buildNumber)) {
  console.error('[xcode-cloud-build-number] FAIL: CI_BUILD_NUMBER must be numeric');
  process.exit(1);
}

if (!fs.existsSync(pbxPath)) {
  console.error('[xcode-cloud-build-number] FAIL: project.pbxproj missing');
  process.exit(1);
}

let pbx = fs.readFileSync(pbxPath, 'utf8');
const re = /CURRENT_PROJECT_VERSION = \d+;/g;
const matches = pbx.match(re);
if (!matches || matches.length === 0) {
  console.error('[xcode-cloud-build-number] FAIL: no CURRENT_PROJECT_VERSION entries found');
  process.exit(1);
}

const next = pbx.replace(re, `CURRENT_PROJECT_VERSION = ${buildNumber};`);
if (next === pbx) {
  console.log(`[xcode-cloud-build-number] CURRENT_PROJECT_VERSION already ${buildNumber}`);
  process.exit(0);
}

fs.writeFileSync(pbxPath, next);
console.log(
  `[xcode-cloud-build-number] CURRENT_PROJECT_VERSION set from CI_BUILD_NUMBER (${matches.length} config(s))`
);
