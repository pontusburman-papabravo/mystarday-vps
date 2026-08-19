#!/usr/bin/env node
/**
 * Verify normal iOS release does not embed WidgetRoutine unless IOS_INCLUDE_WIDGET=1.
 */
import fs from 'fs';
import path from 'path';

const INCLUDE_WIDGET = process.env.IOS_INCLUDE_WIDGET === '1';
const pbxPath = path.join(process.cwd(), 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');

let failed = false;

function fail(msg) {
  console.error(`[verify-ios-widget-release-hold] FAIL: ${msg}`);
  failed = true;
}

function ok(msg) {
  console.log(`[verify-ios-widget-release-hold] OK: ${msg}`);
}

if (!fs.existsSync(pbxPath)) {
  fail('project.pbxproj missing');
  process.exit(1);
}

const pbx = fs.readFileSync(pbxPath, 'utf8');
const appBlock = pbx.match(/504EC3031FED79650016851F \/\* App \*\/ = \{[\s\S]*?\n\t\t\};/);
if (!appBlock) {
  fail('App target block missing');
} else {
  const block = appBlock[0];
  const hasEmbed = block.includes('Embed Foundation Extensions');
  const hasDep = block.includes('R45D01061FED79650016851 /* PBXTargetDependency */');
  if (INCLUDE_WIDGET) {
    if (!hasEmbed || !hasDep) {
      fail('IOS_INCLUDE_WIDGET=1 but App target does not embed WidgetRoutine');
    } else {
      ok('widget embed enabled (IOS_INCLUDE_WIDGET=1)');
    }
  } else {
    if (hasEmbed) {
      fail('App target still lists Embed Foundation Extensions build phase');
    } else {
      ok('widget embed phase absent from App target');
    }
    if (hasDep) {
      fail('App target still depends on WidgetRoutine');
    } else {
      ok('WidgetRoutine target dependency absent from App');
    }
  }
}

if (!pbx.includes('R45D01011FED79650016851 /* WidgetRoutine */')) {
  fail('WidgetRoutine target missing from project');
} else {
  ok('WidgetRoutine source target retained in project');
}

if (failed) {
  console.error('[verify-ios-widget-release-hold] STOP — fix widget release configuration.');
  process.exit(1);
}
console.log('[verify-ios-widget-release-hold] Widget release gate passed.');
process.exit(0);
