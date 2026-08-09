#!/usr/bin/env node
/**
 * Fix WidgetBridgeStore.swift PBX path (R4.5d).
 * File lives in repo plugins/; WidgetRoutine group is ios/App/WidgetRoutine → need ../../../plugins.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const pbxPath = path.join(ROOT, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
const WRONG =
  'path = ../../plugins/capacitor-widget-bridge/ios/Plugin/WidgetBridgeStore.swift';
const RIGHT =
  'path = ../../../plugins/capacitor-widget-bridge/ios/Plugin/WidgetBridgeStore.swift';

const swiftRel = path.join(
  'plugins',
  'capacitor-widget-bridge',
  'ios',
  'Plugin',
  'WidgetBridgeStore.swift'
);
const swiftAbs = path.join(ROOT, swiftRel);

if (!fs.existsSync(pbxPath)) process.exit(0);
if (!fs.existsSync(swiftAbs)) {
  console.error(`[widget-bridge-pbx] Missing ${swiftRel} — is plugins/ checked out?`);
  process.exit(1);
}

let pbx = fs.readFileSync(pbxPath, 'utf8');
if (!pbx.includes('WidgetBridgeStore.swift')) {
  console.log('[widget-bridge-pbx] WidgetBridgeStore not in project — skip');
  process.exit(0);
}

if (pbx.includes(RIGHT)) {
  console.log('[widget-bridge-pbx] WidgetBridgeStore path already correct');
  process.exit(0);
}

if (!pbx.includes(WRONG)) {
  console.error('[widget-bridge-pbx] Unexpected WidgetBridgeStore path in pbxproj — fix manually');
  process.exit(1);
}

pbx = pbx.replace(WRONG, RIGHT);
fs.writeFileSync(pbxPath, pbx);
console.log('[widget-bridge-pbx] Fixed WidgetBridgeStore.swift file reference path');
