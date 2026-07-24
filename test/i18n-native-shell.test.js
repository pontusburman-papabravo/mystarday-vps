'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function readXmlKeys(filePath) {
  const xml = fs.readFileSync(filePath, 'utf8');
  const keys = [];
  const re = /<string name="([^"]+)">/g;
  let m;
  while ((m = re.exec(xml)) !== null) keys.push(m[1]);
  return keys.sort();
}

describe('i18n native shell', () => {
  it('iOS has sv and en-GB InfoPlist.strings', () => {
    const sv = path.join(ROOT, 'ios/App/App/sv.lproj/InfoPlist.strings');
    const en = path.join(ROOT, 'ios/App/App/en-GB.lproj/InfoPlist.strings');
    assert.ok(fs.existsSync(sv));
    assert.ok(fs.existsSync(en));
    assert.match(fs.readFileSync(sv, 'utf8'), /NSCameraUsageDescription/);
    assert.match(fs.readFileSync(en, 'utf8'), /NSCameraUsageDescription/);
  });

  it('iOS Localizable.strings sv/en-GB parity', () => {
    function keysFromStrings(p) {
      const src = fs.readFileSync(p, 'utf8');
      const keys = [];
      const re = /"([^"]+)"\s*=/g;
      let m;
      while ((m = re.exec(src)) !== null) keys.push(m[1]);
      return keys.sort();
    }
    const svKeys = keysFromStrings(path.join(ROOT, 'ios/App/App/sv.lproj/Localizable.strings'));
    const enKeys = keysFromStrings(path.join(ROOT, 'ios/App/App/en-GB.lproj/Localizable.strings'));
    assert.deepEqual(svKeys, enKeys);
  });

  it('Info.plist declares sv and en-GB localizations', () => {
    const plist = fs.readFileSync(path.join(ROOT, 'ios/App/App/Info.plist'), 'utf8');
    assert.match(plist, /<string>sv<\/string>/);
    assert.match(plist, /<string>en-GB<\/string>/);
  });

  it('Android l10n templates exist with key parity', () => {
    const sv = path.join(ROOT, 'scripts/android/l10n/res/values-sv/strings.xml');
    const en = path.join(ROOT, 'scripts/android/l10n/res/values-en-rGB/strings.xml');
    assert.ok(fs.existsSync(sv));
    assert.ok(fs.existsSync(en));
    assert.deepEqual(readXmlKeys(sv), readXmlKeys(en));
  });

  it('native-locale-contract exposes applyFamilyLocale', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/native-locale-contract.js'), 'utf8');
    assert.match(src, /applyFamilyLocale/);
    assert.match(src, /getOsLocaleHint/);
    assert.match(src, /locale-changed/);
  });

  it('native tab bar listens for locale-changed', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/native-tab-bar.js'), 'utf8');
    assert.match(src, /locale-changed/);
  });

  it('platform-html injects native-locale-contract on all pages', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/middleware/platform-html.js'), 'utf8');
    assert.match(src, /native-locale-contract\.js/);
  });

  it('documentation exists', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'docs/i18n-native-app-localisation.md')));
  });
});
