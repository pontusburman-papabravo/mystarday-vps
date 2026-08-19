#!/usr/bin/env node
/**
 * Set canonical MARKETING_VERSION across iOS App + WidgetRoutine targets.
 *
 * Usage: node scripts/ios-xcode-cloud-version.mjs <version>
 * Example: npm run ios:xcode-cloud:version -- 1.4
 *
 * Override project path for tests: IOS_XCODE_PROJECT_PATH
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const VERSION_RE = /^\d+\.\d+(\.\d+)?$/;
const pbxPath =
  process.env.IOS_XCODE_PROJECT_PATH ||
  path.join(ROOT, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');

function usage() {
  console.error('Usage: node scripts/ios-xcode-cloud-version.mjs <version>');
  console.error('Example: npm run ios:xcode-cloud:version -- 1.4');
  process.exit(1);
}

const newVersion = process.argv[2];
if (!newVersion || process.argv.length > 3) {
  usage();
}
if (!VERSION_RE.test(newVersion)) {
  console.error(`[ios-xcode-cloud-version] FAIL: malformed version "${newVersion}"`);
  process.exit(1);
}

if (!fs.existsSync(pbxPath)) {
  console.error(`[ios-xcode-cloud-version] FAIL: project not found at ${pbxPath}`);
  process.exit(1);
}

const pbx = fs.readFileSync(pbxPath, 'utf8');
const versionRe = /MARKETING_VERSION = ([\d.]+);/g;
const found = [...pbx.matchAll(versionRe)].map((m) => m[1]);

if (found.length === 0) {
  console.error('[ios-xcode-cloud-version] FAIL: no MARKETING_VERSION entries in project');
  process.exit(1);
}

const unique = [...new Set(found)];
if (unique.length > 1) {
  console.error(
    `[ios-xcode-cloud-version] FAIL: inconsistent MARKETING_VERSION values: ${unique.join(', ')}`
  );
  process.exit(1);
}

const current = unique[0];
if (current === newVersion) {
  console.log(`[ios-xcode-cloud-version] MARKETING_VERSION already ${newVersion} (no-op)`);
  process.exit(0);
}

const next = pbx.replace(/MARKETING_VERSION = [\d.]+;/g, `MARKETING_VERSION = ${newVersion};`);
if (next === pbx) {
  console.error('[ios-xcode-cloud-version] FAIL: MARKETING_VERSION replace was a no-op');
  process.exit(1);
}

fs.writeFileSync(pbxPath, next);
console.log(`[ios-xcode-cloud-version] MARKETING_VERSION ${current} → ${newVersion}`);
