#!/usr/bin/env node
/**
 * Fix WidgetBridgeStore.swift PBX path (R4.5d).
 * File lives in repo plugins/; WidgetRoutine group is ios/App/WidgetRoutine → need ../../../plugins.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const pbxPath = path.join(ROOT, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
const CANONICAL_PATH =
  '../../../plugins/capacitor-widget-bridge/ios/Plugin/WidgetBridgeStore.swift';
const FILE_REF_MARKER = 'R45D01231FED79650016851 /* WidgetBridgeStore.swift */';

const swiftRel = path.join(
  'plugins',
  'capacitor-widget-bridge',
  'ios',
  'Plugin',
  'WidgetBridgeStore.swift'
);
const swiftAbs = path.join(ROOT, swiftRel);
const resolvedFromGroup = path.normalize(
  path.join(ROOT, 'ios', 'App', 'WidgetRoutine', CANONICAL_PATH)
);

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

const fileRefRe = new RegExp(
  `(${FILE_REF_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} = \\{isa = PBXFileReference;[^}]*path = )([^;]+)`,
  'm'
);
const m = pbx.match(fileRefRe);
if (!m) {
  console.error(
    '[widget-bridge-pbx] Could not find WidgetBridgeStore PBXFileReference line — fix manually in Xcode'
  );
  process.exit(1);
}

const currentPath = m[2].trim();
if (currentPath === CANONICAL_PATH) {
  if (!fs.existsSync(resolvedFromGroup)) {
    console.error(
      `[widget-bridge-pbx] PBX path looks correct but file missing at ${resolvedFromGroup}`
    );
    process.exit(1);
  }
  console.log('[widget-bridge-pbx] WidgetBridgeStore path already correct');
  process.exit(0);
}

if (!fs.existsSync(resolvedFromGroup)) {
  console.error(
    `[widget-bridge-pbx] Refusing to set path — resolved file missing at ${resolvedFromGroup}`
  );
  process.exit(1);
}

const next = pbx.replace(fileRefRe, `$1${CANONICAL_PATH}`);
if (next === pbx) {
  console.error('[widget-bridge-pbx] PBX replace no-op — fix manually');
  process.exit(1);
}

fs.writeFileSync(pbxPath, next);
console.log(
  `[widget-bridge-pbx] Updated WidgetBridgeStore path (${currentPath} → ${CANONICAL_PATH})`
);
