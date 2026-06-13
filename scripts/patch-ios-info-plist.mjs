#!/usr/bin/env node
/**
 * iOS privacy usage descriptions for @capacitor/camera (ITMS-90683 + App Review 5.1.1).
 * Run after `npx cap sync ios` — upserts keys with App Review–approved copy.
 *
 * Usage: node scripts/patch-ios-info-plist.mjs
 */
import fs from 'fs';
import path from 'path';

const infoPlistPath = path.join(process.cwd(), 'ios', 'App', 'App', 'Info.plist');

const APP_NAME = 'Min Stjärndag'; // pragma: allowlist secret

/** User-facing Swedish strings — must explain use + example (Guideline 5.1.1). */
const USAGE_KEYS = {
  NSCameraUsageDescription:
    `${APP_NAME} använder kameran så att du som förälder kan ta en ny profilbild till barnet i appen. Bilden sparas i familjekontot och visas endast för din familj.`,
  NSPhotoLibraryUsageDescription:
    `${APP_NAME} behöver åtkomst till dina foton så att du kan välja en befintlig bild som barnets profilbild. Exempel: du väljer ett foto från albumet "Semester" och det visas som barnets avatar i schemat.`,
  NSPhotoLibraryAddUsageDescription:
    `${APP_NAME} kan spara en profilbild du tar i appen till ditt fotobibliotek om du väljer det, så att du behåller en kopia på din enhet.`,
};

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

if (!fs.existsSync(infoPlistPath)) {
  console.error('Not found:', infoPlistPath);
  console.error('Run: npx cap add ios && npm run cap:sync:ios');
  process.exit(1);
}

let content = fs.readFileSync(infoPlistPath, 'utf8');
const before = content;
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
