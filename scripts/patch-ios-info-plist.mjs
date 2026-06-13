#!/usr/bin/env node
/**
 * iOS privacy usage descriptions for @capacitor/camera (ITMS-90683 + App Review 5.1.1).
 * Run after `npx cap sync ios` — upserts keys with App Review–approved copy.
 *
 * English strings: App Review devices are often set to English (Guideline 5.1.1).
 * We do not save to the photo library — only NSPhotoLibraryUsageDescription is needed.
 *
 * Usage: node scripts/patch-ios-info-plist.mjs
 */
import fs from 'fs';
import path from 'path';

const infoPlistPath = path.join(process.cwd(), 'ios', 'App', 'App', 'Info.plist');

const APP_NAME = 'Min Stjärndag'; // pragma: allowlist secret

/** Must explain use + concrete example (Guideline 5.1.1). */
const USAGE_KEYS = {
  NSCameraUsageDescription:
    `${APP_NAME} uses the camera so you, as a parent, can take a new profile photo for your child in the app. The photo is saved to your family account and shown only to your family.`,
  NSPhotoLibraryUsageDescription:
    `${APP_NAME} needs access to your photos so you can choose an existing picture as your child's profile photo. For example, you can select a photo from your "Summer vacation" album and it will appear as your child's avatar in their daily schedule.`,
};

/** App only reads photos; never saves to the library. */
const REMOVE_KEYS = ['NSPhotoLibraryAddUsageDescription'];

function escapePlistString(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function upsertPlistKey(content, key, value) {
  const escaped = escapePlistString(value);
  const block = `\t<key>${key}</key>\n\t<string>${escaped}</string>`;
  const existing = new RegExp(
    `\\t<key>${key}</key>\\s*\\n\\s*<string>[\\s\\S]*?</string>`
  );
  if (existing.test(content)) {
    return content.replace(existing, block);
  }
  const closingDict = content.lastIndexOf('</dict>');
  if (closingDict === -1) {
    throw new Error('Could not find </dict> in Info.plist');
  }
  return content.slice(0, closingDict) + block + '\n' + content.slice(closingDict);
}

function removePlistKey(content, key) {
  return content.replace(
    new RegExp(`\\t<key>${key}</key>\\s*\\n\\s*<string>[\\s\\S]*?</string>\\s*\\n?`),
    ''
  );
}

if (!fs.existsSync(infoPlistPath)) {
  console.error('Not found:', infoPlistPath);
  console.error('Run: npx cap add ios && npm run cap:sync:ios');
  process.exit(1);
}

let content = fs.readFileSync(infoPlistPath, 'utf8');
const before = content;
for (const key of REMOVE_KEYS) {
  content = removePlistKey(content, key);
}
for (const [key, value] of Object.entries(USAGE_KEYS)) {
  content = upsertPlistKey(content, key, value);
}

if (content === before) {
  console.log('Info.plist usage descriptions unchanged.');
} else {
  fs.writeFileSync(infoPlistPath, content);
  console.log(`Patched Info.plist: updated ${Object.keys(USAGE_KEYS).length} usage description(s).`);
}

console.log('Next: bump Build in Xcode → Archive → Upload');
