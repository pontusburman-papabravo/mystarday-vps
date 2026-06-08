#!/usr/bin/env node
/**
 * Disable ENABLE_USER_SCRIPT_SANDBOXING in ios/App/App.xcodeproj (Xcode 15+).
 * Fixes: Sandbox deny file-read-data Pods-App-frameworks.sh
 *
 * Usage: node scripts/patch-ios-xcode-sandbox.mjs
 */
import fs from 'fs';
import path from 'path';

const pbxPath = path.join(process.cwd(), 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');

if (!fs.existsSync(pbxPath)) {
  console.error('Not found:', pbxPath);
  console.error('Run: npx cap add ios');
  process.exit(1);
}

let content = fs.readFileSync(pbxPath, 'utf8');
const before = content;

content = content.replace(/ENABLE_USER_SCRIPT_SANDBOXING = YES;/g, 'ENABLE_USER_SCRIPT_SANDBOXING = NO;');

if (!content.includes('ENABLE_USER_SCRIPT_SANDBOXING = NO')) {
  // Insert for each XCBuildConfiguration block missing the key (Xcode 16 default)
  content = content.replace(
    /(buildSettings = \{)(\n)/g,
    (match, open, nl) => {
      if (match.includes('ENABLE_USER_SCRIPT_SANDBOXING')) return match;
      return `${open}${nl}\t\t\t\tENABLE_USER_SCRIPT_SANDBOXING = NO;${nl}`;
    }
  );
}

if (content === before) {
  console.log('Xcode project already has script sandboxing disabled (or no YES found).');
} else {
  fs.writeFileSync(pbxPath, content);
  console.log('Patched App.xcodeproj: ENABLE_USER_SCRIPT_SANDBOXING = NO');
}

console.log('Next: rm -rf ~/Library/Developer/Xcode/DerivedData/*');
console.log('Then: open ios/App/App.xcworkspace → Clean Build Folder → Build');
