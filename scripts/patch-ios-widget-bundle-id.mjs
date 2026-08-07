#!/usr/bin/env node
/**
 * Set WIDGET_PARENT_BUNDLE_ID from main app target (R4.5d).
 */
import fs from 'fs';
import path from 'path';

const pbxPath = path.join(process.cwd(), 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
if (!fs.existsSync(pbxPath)) process.exit(0);

let pbx = fs.readFileSync(pbxPath, 'utf8');
const mainMatch = pbx.match(
  /PRODUCT_BUNDLE_IDENTIFIER = ([^;\n]+);\s*\/\/ pragma: allowlist secret/
);
if (!mainMatch) {
  console.warn('[widget-bundle] Main bundle id not found — skip WIDGET_PARENT_BUNDLE_ID');
  process.exit(0);
}
const parentId = mainMatch[1].trim();
const setting = `WIDGET_PARENT_BUNDLE_ID = ${parentId};`;

if (pbx.includes('WIDGET_PARENT_BUNDLE_ID')) {
  pbx = pbx.replace(/WIDGET_PARENT_BUNDLE_ID = [^;]+;/g, setting);
} else {
  pbx = pbx.replace(
    /(504EC3141FED79650016851F \/\* Debug \*\/ = \{[\s\S]*?IPHONEOS_DEPLOYMENT_TARGET = 14\.0;\n)/,
    `$1\t\t\t\t${setting}\n`
  );
  pbx = pbx.replace(
    /(504EC3151FED79650016851F \/\* Release \*\/ = \{[\s\S]*?IPHONEOS_DEPLOYMENT_TARGET = 14\.0;\n)/,
    `$1\t\t\t\t${setting}\n`
  );
}
fs.writeFileSync(pbxPath, pbx);
console.log('[widget-bundle] WIDGET_PARENT_BUNDLE_ID configured');
