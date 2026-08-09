#!/usr/bin/env node
/**
 * Verify iOS WidgetRoutine extension (R4.5d).
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
let ok = true;

function fail(msg) {
  console.error('FAIL:', msg);
  ok = false;
}

const requiredSwift = [
  'ios/App/WidgetRoutine/WidgetRoutineBundle.swift',
  'ios/App/WidgetRoutine/WidgetAPIClient.swift',
  'ios/App/WidgetRoutine/WidgetIntents.swift',
  'ios/App/WidgetRoutine/WidgetEntryBuilder.swift',
];

for (const rel of requiredSwift) {
  if (!fs.existsSync(path.join(ROOT, rel))) fail(`Missing ${rel}`);
}

const pbx = path.join(ROOT, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
if (!fs.existsSync(pbx)) {
  fail('Missing Xcode project');
} else {
  const src = fs.readFileSync(pbx, 'utf8');
  if (!src.includes('R45D01011FED79650016851 /* WidgetRoutine */')) {
    fail('WidgetRoutine target missing — run patch-ios-widget-extension.mjs');
  }
  if (!/WIDGET_PARENT_BUNDLE_ID\s*=/.test(src)) {
    fail(
      'WIDGET_PARENT_BUNDLE_ID build setting missing — run patch-ios-widget-bundle-id.mjs (or ios:release:prepare)'
    );
  }
  const projectDebug = src.match(
    /504EC3141FED79650016851F \/\* Debug \*\/ = \{[\s\S]*?buildSettings = \{([\s\S]*?)\n\t\t\t\};/
  );
  if (!projectDebug || !/WIDGET_PARENT_BUNDLE_ID\s*=/.test(projectDebug[1])) {
    fail(
      'WIDGET_PARENT_BUNDLE_ID must be set on project-level Debug (not App-target only) — re-run patch-ios-widget-bundle-id.mjs'
    );
  }
  const bridgeRel =
    '../../../plugins/capacitor-widget-bridge/ios/Plugin/WidgetBridgeStore.swift';
  if (!src.includes(bridgeRel)) {
    fail(
      `WidgetBridgeStore.swift PBX path must be ${bridgeRel} — run patch-ios-widget-bridge-store-path.mjs`
    );
  }
  const bridgeAbs = path.join(
    ROOT,
    'plugins',
    'capacitor-widget-bridge',
    'ios',
    'Plugin',
    'WidgetBridgeStore.swift'
  );
  if (!fs.existsSync(bridgeAbs)) {
    fail(`Missing ${path.relative(ROOT, bridgeAbs)} on disk`);
  }
}

if (!fs.existsSync(path.join(ROOT, 'ios/App/WidgetRoutine/WidgetRoutine.entitlements'))) {
  fail('WidgetRoutine.entitlements missing');
}

if (!ok) process.exit(1);
console.log('iOS WidgetRoutine extension layout OK');
