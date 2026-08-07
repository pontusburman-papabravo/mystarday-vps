#!/usr/bin/env node
/**
 * iOS privacy usage descriptions for @capacitor/camera (ITMS-90683 + App Review 5.1.1).
 * Run after `npx cap sync ios` — upserts keys with App Review–approved copy.
 *
 * Product default region is Swedish (App Store primary). Also ships en-GB for
 * English (UK) native permission strings. Writes sv.lproj + en-GB.lproj
 * InfoPlist.strings and removes legacy en.lproj if Capacitor reintroduces it.
 *
 * Usage: node scripts/patch-ios-info-plist.mjs
 */
import fs from 'fs';
import path from 'path';

const appDir = path.join(process.cwd(), 'ios', 'App', 'App');
const infoPlistPath = path.join(appDir, 'Info.plist');

const APP_NAME = 'Min Stjärndag'; // pragma: allowlist secret

const EN_USAGE = {
  NSCameraUsageDescription:
    `${APP_NAME} uses the camera so you can take a new profile photo for your child in the app. The photo is saved on your family account and is only shown to your family.`,
  NSPhotoLibraryUsageDescription:
    `${APP_NAME} needs access to your photos so you can choose an existing picture as your child's profile photo. For example, you can pick a photo from a summer album and it will appear as your child's avatar in the daily schedule.`,
};

const SV_USAGE = {
  NSCameraUsageDescription:
    `${APP_NAME} använder kameran så att du som förälder kan ta en ny profilbild till ditt barn i appen. Bilden sparas på familjekontot och visas bara för er familj.`,
  NSPhotoLibraryUsageDescription:
    `${APP_NAME} behöver tillgång till dina foton så att du kan välja en befintlig bild som ditt barns profilbild. Till exempel kan du välja ett foto från albumet ”Sommarlov” så visas det som ditt barns avatar i dagschemat.`,
};

/** App only reads photos; never saves to the library. No ATT — no cross-app tracking. */
const REMOVE_KEYS = ['NSPhotoLibraryAddUsageDescription', 'NSUserTrackingUsageDescription'];

function escapePlistString(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeStringsFile(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
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

function upsertPlistStringArray(content, key, values) {
  const items = values.map((v) => `\t\t<string>${escapePlistString(v)}</string>`).join('\n');
  const block = `\t<key>${key}</key>\n\t<array>\n${items}\n\t</array>`;
  const existing = new RegExp(
    `\\t<key>${key}</key>\\s*\\n\\s*(?:<string>[\\s\\S]*?</string>|<array>[\\s\\S]*?</array>)`
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

function writeInfoPlistStrings(localeDir, usage, comment) {
  const dir = path.join(appDir, localeDir);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, 'InfoPlist.strings');
  const lines = [
    comment,
    `"CFBundleDisplayName" = "${escapeStringsFile(APP_NAME)}"; // pragma: allowlist secret`,
    `"NSCameraUsageDescription" = "${escapeStringsFile(usage.NSCameraUsageDescription)}"; // pragma: allowlist secret`,
    `"NSPhotoLibraryUsageDescription" = "${escapeStringsFile(usage.NSPhotoLibraryUsageDescription)}"; // pragma: allowlist secret`,
  ];
  if (usage.NSUserTrackingUsageDescription) {
    lines.push(`"NSUserTrackingUsageDescription" = "${escapeStringsFile(usage.NSUserTrackingUsageDescription)}";`);
  }
  lines.push('');
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  return filePath;
}

function writeSwedishInfoPlistStrings() {
  return writeInfoPlistStrings(
    'sv.lproj',
    SV_USAGE,
    '/* App Store + system permission strings (Swedish) */'
  );
}

function writeEnGbInfoPlistStrings() {
  return writeInfoPlistStrings(
    'en-GB.lproj',
    EN_USAGE,
    '/* App Store + system permission strings (British English) */'
  );
}

function removeEnglishLproj() {
  const enDir = path.join(appDir, 'en.lproj');
  if (!fs.existsSync(enDir)) return false;
  fs.rmSync(enDir, { recursive: true, force: true });
  return true;
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

content = upsertPlistKey(content, 'CFBundleDevelopmentRegion', 'sv');
content = upsertPlistStringArray(content, 'CFBundleLocalizations', ['sv', 'en-GB']);

// Base Info.plist = development language (Swedish)
for (const [key, value] of Object.entries(SV_USAGE)) {
  content = upsertPlistKey(content, key, value);
}

if (content !== before) {
  fs.writeFileSync(infoPlistPath, content);
  console.log('Patched Info.plist: sv development region + sv/en-GB localizations.');
} else {
  console.log('Info.plist localization keys unchanged.');
}

const svPath = writeSwedishInfoPlistStrings();
const enPath = writeEnGbInfoPlistStrings();
console.log(`Wrote ${path.relative(process.cwd(), svPath)}`);
console.log(`Wrote ${path.relative(process.cwd(), enPath)}`);
if (removeEnglishLproj()) {
  console.log('Removed ios/App/App/en.lproj (legacy Capacitor English folder).');
}
console.log('Next: bump Build in Xcode if needed → Archive → Upload');
