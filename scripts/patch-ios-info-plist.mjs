#!/usr/bin/env node
/**
 * Add iOS privacy usage descriptions required by @capacitor/camera (ITMS-90683).
 * Run after `npx cap sync ios` — cap sync does not add these automatically.
 *
 * Usage: node scripts/patch-ios-info-plist.mjs
 */
import fs from 'fs';
import path from 'path';

const infoPlistPath = path.join(process.cwd(), 'ios', 'App', 'App', 'Info.plist');

/** User-facing Swedish strings shown in iOS permission dialogs. */
const USAGE_KEYS = {
  NSCameraUsageDescription:
    'Min Stjärndag behöver kameran så att du kan ta en profilbild till barnet.',
  NSPhotoLibraryUsageDescription:
    'Min Stjärndag behöver åtkomst till ditt fotobibliotek så att du kan välja en profilbild till barnet.',
  NSPhotoLibraryAddUsageDescription:
    'Min Stjärndag behöver spara bilder i ditt fotobibliotek när du tar eller väljer en profilbild.',
};

function escapePlistString(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function patchInfoPlist(content) {
  let updated = content;
  const toInsert = [];

  for (const [key, value] of Object.entries(USAGE_KEYS)) {
    if (new RegExp(`<key>${key}</key>`).test(updated)) {
      console.log('Already set:', key);
      continue;
    }
    toInsert.push(
      `\t<key>${key}</key>\n\t<string>${escapePlistString(value)}</string>`
    );
  }

  if (toInsert.length === 0) {
    return { content: updated, changed: false };
  }

  const closingDict = updated.lastIndexOf('</dict>');
  if (closingDict === -1) {
    throw new Error('Could not find </dict> in Info.plist');
  }

  updated =
    updated.slice(0, closingDict) +
    toInsert.join('\n') +
    '\n' +
    updated.slice(closingDict);

  return { content: updated, changed: true, added: toInsert.length };
}

if (!fs.existsSync(infoPlistPath)) {
  console.error('Not found:', infoPlistPath);
  console.error('Run: npx cap add ios && npm run cap:sync:ios');
  process.exit(1);
}

const before = fs.readFileSync(infoPlistPath, 'utf8');
const result = patchInfoPlist(before);

if (!result.changed) {
  console.log('Info.plist already has all camera/photo library usage descriptions.');
} else {
  fs.writeFileSync(infoPlistPath, result.content);
  console.log(`Patched Info.plist: added ${result.added} usage description(s).`);
}

console.log('Next: bump Build in Xcode → Archive → Upload');
