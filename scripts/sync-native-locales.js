'use strict';

/**
 * Declared native languages follow the public locale catalog.
 * Store locale codes live in store/locales.json. This script only writes
 * the iOS localization list for locales that are already public.
 *
 * Usage: node scripts/sync-native-locales.js [--check]
 */

const fs = require('fs');
const path = require('path');
const { loadStoreCatalog } = require('../src/lib/store-locale');

const ROOT = path.join(__dirname, '..');
const PLIST = path.join(ROOT, 'ios/App/App/Info.plist');

function publicLocales() {
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/locale-catalog.json'), 'utf8'));
  return catalog.locales.filter((locale) => locale.availability === 'public');
}

function expectedIosLanguages() {
  const store = loadStoreCatalog();
  const languages = [];
  for (const locale of publicLocales()) {
    const row = store.locales.appLocales[locale.id];
    const ios = row && row.native && row.native.ios;
    if (!ios) {
      throw new Error(`Public locale ${locale.id} has no native.ios in store/locales.json`);
    }
    languages.push(ios);
  }
  return languages;
}

function expectedAndroidResources() {
  const store = loadStoreCatalog();
  const files = [];
  for (const locale of publicLocales()) {
    const row = store.locales.appLocales[locale.id];
    const resources = (row && row.native && row.native.androidResources) || [];
    if (!resources.length) {
      throw new Error(`Public locale ${locale.id} has no native.androidResources`);
    }
    files.push(...resources);
  }
  return files;
}

function renderLocalizations(languages) {
  const lines = languages.map((lang) => `\t\t<string>${lang}</string>`);
  return `\t<key>CFBundleLocalizations</key>\n\t<array>\n${lines.join('\n')}\n\t</array>`;
}

function currentLanguages(plist) {
  const match = plist.match(/<key>CFBundleLocalizations<\/key>\s*<array>([\s\S]*?)<\/array>/);
  if (!match) return [];
  return [...match[1].matchAll(/<string>([^<]+)<\/string>/g)].map((item) => item[1]);
}

function syncIos(checkOnly) {
  const expected = expectedIosLanguages();
  const plist = fs.readFileSync(PLIST, 'utf8');
  const current = currentLanguages(plist);
  const same = current.length === expected.length && current.every((lang, i) => lang === expected[i]);
  if (same) return { changed: false, languages: expected };
  if (checkOnly) {
    throw new Error(
      `CFBundleLocalizations is ${current.join(', ')}; catalog expects ${expected.join(', ')}. Run node scripts/sync-native-locales.js`
    );
  }
  const next = plist.replace(
    /<key>CFBundleLocalizations<\/key>\s*<array>[\s\S]*?<\/array>/,
    renderLocalizations(expected)
  );
  fs.writeFileSync(PLIST, next);
  return { changed: true, languages: expected };
}

function checkAndroidResources() {
  const missing = [];
  for (const rel of expectedAndroidResources()) {
    if (!fs.existsSync(path.join(ROOT, rel))) missing.push(rel);
  }
  if (missing.length) {
    throw new Error(`Native Android strings missing:\n${missing.join('\n')}`);
  }
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const ios = syncIos(checkOnly);
  checkAndroidResources();
  console.log(`[native-locales] iOS ${ios.languages.join(', ')}${ios.changed ? ' (updated)' : ''}`);
  console.log('[native-locales] Android resource packs present');
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
}

module.exports = {
  expectedIosLanguages,
  expectedAndroidResources,
  syncIos,
  checkAndroidResources,
};
