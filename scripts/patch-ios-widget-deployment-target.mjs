#!/usr/bin/env node
/**
 * WidgetRoutine uses App Intents + iOS 17 SwiftUI; minimum 17.0 (main app may stay 14).
 * Idempotent: exit 0 when WidgetRoutine Debug/Release are already 17.0.
 */
import fs from 'fs';
import path from 'path';

const TARGET_VERSION = '17.0';
const pbxPath = path.join(process.cwd(), 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');

if (!fs.existsSync(pbxPath)) {
  process.exit(0);
}

let pbx = fs.readFileSync(pbxPath, 'utf8');
if (!pbx.includes('R45D01011FED79650016851 /* WidgetRoutine */')) {
  console.log('[widget-deployment] WidgetRoutine target missing — skip');
  process.exit(0);
}

const widgetDeployRe =
  /INFOPLIST_FILE = WidgetRoutine\/Info\.plist;\n\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = ([\d.]+);/g;

const matches = [...pbx.matchAll(widgetDeployRe)];
if (matches.length === 0) {
  console.error(
    '[widget-deployment] FAIL: WidgetRoutine build settings missing IPHONEOS_DEPLOYMENT_TARGET'
  );
  process.exit(1);
}

const needsPatch = matches.filter((m) => m[1] !== TARGET_VERSION);
if (needsPatch.length === 0) {
  console.log(`[widget-deployment] WidgetRoutine already at iOS ${TARGET_VERSION}`);
  process.exit(0);
}

const patchRe =
  /(INFOPLIST_FILE = WidgetRoutine\/Info\.plist;\n\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = )([\d.]+);/g;

let patched = 0;
const next = pbx.replace(patchRe, (match, prefix, current) => {
  if (current === TARGET_VERSION) {
    return match;
  }
  patched += 1;
  return `${prefix}${TARGET_VERSION};`;
});

if (patched === 0) {
  console.error(
    '[widget-deployment] FAIL: WidgetRoutine deployment target not 17.0 and patch was a no-op'
  );
  process.exit(1);
}

fs.writeFileSync(pbxPath, next);
console.log(
  `[widget-deployment] WidgetRoutine IPHONEOS_DEPLOYMENT_TARGET = ${TARGET_VERSION} (${patched} config(s))`
);
