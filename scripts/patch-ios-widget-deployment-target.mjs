#!/usr/bin/env node
/**
 * WidgetRoutine uses App Intents + iOS 17 SwiftUI; minimum 17.0 (main app may stay 14).
 */
import fs from 'fs';
import path from 'path';

const pbxPath = path.join(process.cwd(), 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
if (!fs.existsSync(pbxPath)) process.exit(0);

let pbx = fs.readFileSync(pbxPath, 'utf8');
if (!pbx.includes('R45D01011FED79650016851 /* WidgetRoutine */')) {
  console.log('[widget-deployment] WidgetRoutine target missing — skip');
  process.exit(0);
}

const widgetBlockRe =
  /(R45D0200[01]1FED79650016851 \/\* (?:Debug|Release) \*\/ = \{[\s\S]*?INFOPLIST_FILE = WidgetRoutine\/Info\.plist;\n\s*IPHONEOS_DEPLOYMENT_TARGET = )[\d.]+;/g;

let count = 0;
const next = pbx.replace(widgetBlockRe, (match, prefix) => {
  count += 1;
  return `${prefix}17.0;`;
});

if (count === 0) {
  console.error('[widget-deployment] Could not patch WidgetRoutine IPHONEOS_DEPLOYMENT_TARGET');
  process.exit(1);
}

if (next === pbx) {
  console.log('[widget-deployment] WidgetRoutine already at iOS 17.0');
  process.exit(0);
}

fs.writeFileSync(pbxPath, next);
console.log('[widget-deployment] WidgetRoutine IPHONEOS_DEPLOYMENT_TARGET = 17.0');
