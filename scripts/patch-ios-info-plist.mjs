#!/usr/bin/env node
/**
 * iOS privacy usage descriptions for @capacitor/camera (ITMS-90683 + App Review 5.1.1).
 * Run after `npx cap sync ios` — upserts keys with App Review–approved copy.
 *
 * Product is Swedish-only. Development region is Swedish so App Store SPRÅK lists
 * Svenska (not English). Writes sv.lproj/InfoPlist.strings and removes en.lproj if
 * present so Capacitor sync cannot reintroduce English as a declared language.
 *
 * Usage: node scripts/patch-ios-info-plist.mjs
 */
import fs from 'fs';
import path from 'path';

const appDir = path.join(process.cwd(), 'ios', 'App', 'App');
const infoPlistPath = path.join(appDir, 'Info.plist');

const APP_NAME = 'Min Stjärndag'; // pragma: allowlist secret

const SV_USAGE = {
  NSCameraUsageDescription:
    `${APP_NAME} använder kameran så att du som förälder kan ta en ny profilbild till ditt barn i appen. Bilden sparas på familjekontot och visas bara för er familj.`,
  NSPhotoLibraryUsageDescription:
    `${APP_NAME} behöver tillgång till dina foton så att du kan välja en befintlig bild som ditt barns profilbild. Till exempel kan du välja ett foto från albumet ”Sommarlov” så visas det som ditt barns avatar i dagschemat.`,
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

function writeSwedishInfoPlistStrings() {
  const dir = path.join(appDir, 'sv.lproj');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, 'InfoPlist.strings');
  const body = [
    '/* App Store + system permission strings (Swedish only) */',
    `"CFBundleDisplayName" = "${escapeStringsFile(APP_NAME)}"; // pragma: allowlist secret`,
    `"NSCameraUsageDescription" = "${escapeStringsFile(SV_USAGE.NSCameraUsageDescription)}"; // pragma: allowlist secret`,
    `"NSPhotoLibraryUsageDescription" = "${escapeStringsFile(SV_USAGE.NSPhotoLibraryUsageDescription)}"; // pragma: allowlist secret`,
    '',
  ].join('\n');
  fs.writeFileSync(filePath, body, 'utf8');
  return filePath;
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
content = upsertPlistStringArray(content, 'CFBundleLocalizations', ['sv']);

// Base Info.plist = development language (Swedish)
for (const [key, value] of Object.entries(SV_USAGE)) {
  content = upsertPlistKey(content, key, value);
}

if (content !== before) {
  fs.writeFileSync(infoPlistPath, content);
  console.log('Patched Info.plist: Swedish-only development region + usage descriptions.');
} else {
  console.log('Info.plist localization keys unchanged.');
}

const svPath = writeSwedishInfoPlistStrings();
console.log(`Wrote ${path.relative(process.cwd(), svPath)}`);
if (removeEnglishLproj()) {
  console.log('Removed ios/App/App/en.lproj (Swedish-only App Store language).');
}
console.log('Next: bump Build in Xcode if needed → Archive → Upload');
