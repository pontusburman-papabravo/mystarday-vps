#!/usr/bin/env node
/**
 * Disable ENABLE_USER_SCRIPT_SANDBOXING in ios Xcode projects (Xcode 15+).
 * Fixes: Sandbox deny file-read-data Pods-App-frameworks.sh
 *
 * Run after `pod install` so CocoaPods does not overwrite the setting.
 *
 * Usage: node scripts/patch-ios-xcode-sandbox.mjs
 */
import fs from 'fs';
import path from 'path';

const PROJECTS = [
  path.join(process.cwd(), 'ios', 'App', 'App.xcodeproj', 'project.pbxproj'),
  path.join(process.cwd(), 'ios', 'App', 'Pods', 'Pods.xcodeproj', 'project.pbxproj'),
];

function patchPbxproj(pbxPath) {
  if (!fs.existsSync(pbxPath)) {
    return { path: pbxPath, status: 'missing' };
  }

  let content = fs.readFileSync(pbxPath, 'utf8');
  const before = content;

  content = content.replace(/ENABLE_USER_SCRIPT_SANDBOXING = YES;/g, 'ENABLE_USER_SCRIPT_SANDBOXING = NO;');
  content = content.replace(/ENABLE_USER_SCRIPT_SANDBOXING = "YES";/g, 'ENABLE_USER_SCRIPT_SANDBOXING = NO;');

  // Ensure every buildSettings block has the key (Xcode 16 defaults to YES without writing it)
  content = content.replace(
    /buildSettings = \{([\s\S]*?)\n(\s+)\};/g,
    (match, settings, closingIndent) => {
      if (/ENABLE_USER_SCRIPT_SANDBOXING/.test(settings)) {
        const fixed = settings.replace(/ENABLE_USER_SCRIPT_SANDBOXING = YES;/g, 'ENABLE_USER_SCRIPT_SANDBOXING = NO;');
        if (fixed === settings) return match;
        return `buildSettings = {${fixed}\n${closingIndent}};`;
      }
      return `buildSettings = {${settings}\n${closingIndent}ENABLE_USER_SCRIPT_SANDBOXING = NO;\n${closingIndent}};`;
    }
  );

  if (content === before) {
    return { path: pbxPath, status: 'unchanged' };
  }

  fs.writeFileSync(pbxPath, content);
  return { path: pbxPath, status: 'patched' };
}

const appPbx = PROJECTS[0];
if (!fs.existsSync(appPbx)) {
  console.error('Not found:', appPbx);
  console.error('Run: npx cap add ios && npm run cap:sync:ios');
  process.exit(1);
}

let patched = 0;
for (const pbxPath of PROJECTS) {
  const result = patchPbxproj(pbxPath);
  if (result.status === 'patched') {
    console.log('Patched:', path.relative(process.cwd(), result.path));
    patched += 1;
  } else if (result.status === 'unchanged') {
    console.log('Already OK:', path.relative(process.cwd(), result.path));
  }
}

if (patched === 0) {
  console.log('Script sandboxing already disabled in Xcode project(s).');
} else {
  console.log(`Updated ${patched} project file(s): ENABLE_USER_SCRIPT_SANDBOXING = NO`);
}

console.log('');
console.log('On Mac, also run:');
console.log('  rm -rf ~/Library/Developer/Xcode/DerivedData/*');
console.log('  open ios/App/App.xcworkspace → Product → Clean Build Folder → Build');
