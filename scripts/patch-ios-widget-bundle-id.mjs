#!/usr/bin/env node
/**
 * Set WIDGET_PARENT_BUNDLE_ID from main app target (R4.5d).
 */
import fs from 'fs';
import path from 'path';

const pbxPath = path.join(process.cwd(), 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
if (!fs.existsSync(pbxPath)) process.exit(0);

let pbx = fs.readFileSync(pbxPath, 'utf8');

/** App target bundle id (not the widget $(WIDGET_PARENT_BUNDLE_ID) macro). */
function readMainAppBundleId(source) {
  const blockRe = /buildSettings = \{([\s\S]*?)\n\t\t\t\};/g;
  for (const match of source.matchAll(blockRe)) {
    const settings = match[1];
    if (!settings.includes('INFOPLIST_FILE = App/Info.plist')) continue;
    if (settings.includes('APPLICATION_EXTENSION_API_ONLY')) continue;
    const bid = settings.match(/PRODUCT_BUNDLE_IDENTIFIER = ([^;\n]+);/);
    if (!bid) continue;
    const raw = bid[1].trim().replace(/^"|"$/g, '');
    if (raw && !raw.includes('$(')) {
      return raw;
    }
  }

  const re =
    /INFOPLIST_FILE = App\/Info\.plist;[\s\S]*?PRODUCT_BUNDLE_IDENTIFIER = ([^;\n]+);/g;
  for (const match of source.matchAll(re)) {
    const raw = match[1].trim().replace(/^"|"$/g, '');
    if (raw && !raw.includes('$(')) {
      return raw;
    }
  }

  const pragmaMatch = source.match(
    /PRODUCT_BUNDLE_IDENTIFIER = ([^;\n]+);\s*\/\/ pragma: allowlist secret/
  );
  if (pragmaMatch) {
    const raw = pragmaMatch[1].trim().replace(/^"|"$/g, '');
    if (raw && !raw.includes('$(')) {
      return raw;
    }
  }

  return null;
}

function hasWidgetParentBuildSetting(source) {
  return /WIDGET_PARENT_BUNDLE_ID\s*=/.test(source);
}

const parentId = readMainAppBundleId(pbx);
if (!parentId) {
  console.error(
    '[widget-bundle] FAIL: could not read main App PRODUCT_BUNDLE_IDENTIFIER from project.pbxproj'
  );
  process.exit(1);
}

const setting = `WIDGET_PARENT_BUNDLE_ID = ${parentId}; // pragma: allowlist secret`;

if (hasWidgetParentBuildSetting(pbx)) {
  pbx = pbx.replace(
    /WIDGET_PARENT_BUNDLE_ID\s*=\s*[^;]+;\s*(\/\/ pragma: allowlist secret)?\n/g,
    `${setting}\n`
  );
} else {
  let insertCount = 0;
  pbx = pbx.replace(/(INFOPLIST_FILE = App\/Info\.plist;\n)/g, (line) => {
    insertCount += 1;
    return `${line}\t\t\t\t${setting}\n`;
  });
  if (insertCount === 0) {
    console.error(
      '[widget-bundle] FAIL: could not insert WIDGET_PARENT_BUNDLE_ID into App Debug/Release build settings'
    );
    process.exit(1);
  }
}

fs.writeFileSync(pbxPath, pbx);
console.log('[widget-bundle] WIDGET_PARENT_BUNDLE_ID configured');
