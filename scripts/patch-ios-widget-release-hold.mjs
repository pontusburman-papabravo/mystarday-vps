#!/usr/bin/env node
/**
 * iOS 1.4+ normal release excludes WidgetRoutine.appex from the App archive.
 * Widget source/target remain in the project for future work.
 *
 * Opt-in: set IOS_INCLUDE_WIDGET=1 to embed the widget (not used for 1.4 release).
 */
import fs from 'fs';
import path from 'path';

const INCLUDE_WIDGET = process.env.IOS_INCLUDE_WIDGET === '1';
const pbxPath = path.join(process.cwd(), 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');

const EMBED_PHASE_LINE = 'R45D01051FED79650016851 /* Embed Foundation Extensions */,';
const WIDGET_DEP_LINE = 'R45D01061FED79650016851 /* PBXTargetDependency */,';

if (!fs.existsSync(pbxPath)) {
  process.exit(0);
}

let pbx = fs.readFileSync(pbxPath, 'utf8');
if (!pbx.includes('R45D01011FED79650016851 /* WidgetRoutine */')) {
  console.log('[widget-release-hold] WidgetRoutine target missing — skip');
  process.exit(0);
}

function appTargetBlock(src) {
  const match = src.match(/504EC3031FED79650016851F \/\* App \*\/ = \{[\s\S]*?\n\t\t\};/);
  return match ? match[0] : '';
}

function widgetEmbedded(src) {
  const block = appTargetBlock(src);
  return block.includes(EMBED_PHASE_LINE) && block.includes(WIDGET_DEP_LINE);
}

function removeWidgetEmbed(src) {
  let next = src;
  next = next.replace(/\t\t\t\tR45D01051FED79650016851 \/\* Embed Foundation Extensions \*\/,\n/g, '');
  next = next.replace(
    /(504EC3031FED79650016851F \/\* App \*\/ = \{[\s\S]*?dependencies = \(\n)\s*R45D01061FED79650016851 \/\* PBXTargetDependency \*\/,\n/g,
    '$1'
  );
  return next;
}

function ensureWidgetEmbed(src) {
  let next = src;
  if (!next.includes(EMBED_PHASE_LINE)) {
    next = next.replace(
      '504EC3021FED79650016851F /* Resources */,',
      `504EC3021FED79650016851F /* Resources */,\n\t\t\t\t${EMBED_PHASE_LINE}`
    );
  }
  if (!widgetEmbedded(next)) {
    next = next.replace(
      /(504EC3031FED79650016851F \/\* App \*\/ = \{[\s\S]*?dependencies = \(\n)(\t\t\t\);)/,
      `$1\t\t\t\t${WIDGET_DEP_LINE}\n$2`
    );
  }
  return next;
}

const before = pbx;
if (INCLUDE_WIDGET) {
  pbx = ensureWidgetEmbed(pbx);
  if (pbx !== before) {
    fs.writeFileSync(pbxPath, pbx);
    console.log('[widget-release-hold] IOS_INCLUDE_WIDGET=1 — widget embed enabled');
  } else {
    console.log('[widget-release-hold] IOS_INCLUDE_WIDGET=1 — widget already embedded');
  }
  process.exit(0);
}

if (!widgetEmbedded(pbx)) {
  console.log('[widget-release-hold] WidgetRoutine not embedded (normal release path)');
  process.exit(0);
}

pbx = removeWidgetEmbed(pbx);
if (pbx === before) {
  console.error('[widget-release-hold] FAIL: widget embed removal was a no-op');
  process.exit(1);
}

fs.writeFileSync(pbxPath, pbx);
console.log('[widget-release-hold] WidgetRoutine.appex excluded from App archive (ON HOLD)');
