#!/usr/bin/env node
/**
 * Main App minimum iOS 15.0 (WidgetRoutine stays 17.0 via patch-ios-widget-deployment-target).
 * Idempotent: exit 0 when all non-widget deployment targets are already 15.0.
 */
import fs from 'fs';
import path from 'path';

const TARGET_VERSION = '15.0';
const pbxPath = path.join(process.cwd(), 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');

if (!fs.existsSync(pbxPath)) {
  process.exit(0);
}

let pbx = fs.readFileSync(pbxPath, 'utf8');
const legacy = 'IPHONEOS_DEPLOYMENT_TARGET = 14.0;';
const target = `IPHONEOS_DEPLOYMENT_TARGET = ${TARGET_VERSION};`;

if (!pbx.includes(legacy)) {
  if (pbx.includes(target)) {
    console.log(`[main-deployment] Main app already at iOS ${TARGET_VERSION}`);
    process.exit(0);
  }
  console.error(
    `[main-deployment] FAIL: expected ${legacy} or ${target} in project — inspect project.pbxproj`
  );
  process.exit(1);
}

const patched = pbx.split(legacy).length - 1;
pbx = pbx.replaceAll(legacy, target);
fs.writeFileSync(pbxPath, pbx);
console.log(
  `[main-deployment] IPHONEOS_DEPLOYMENT_TARGET = ${TARGET_VERSION} (${patched} config(s))`
);
