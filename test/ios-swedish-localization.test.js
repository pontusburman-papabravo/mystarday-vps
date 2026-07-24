'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('iOS native shell localization', () => {
  it('Info.plist keeps Swedish development region and declares sv + en-GB', () => {
    const plist = fs.readFileSync(path.join(ROOT, 'ios/App/App/Info.plist'), 'utf8');
    assert.match(plist, /<key>CFBundleDevelopmentRegion<\/key>\s*<string>sv<\/string>/);
    assert.match(plist, /<string>sv<\/string>/);
    assert.match(plist, /<string>en-GB<\/string>/);
    assert.match(plist, /använder kameran/);
  });

  it('sv and en-GB InfoPlist.strings exist; legacy en.lproj absent', () => {
    const sv = fs.readFileSync(
      path.join(ROOT, 'ios/App/App/sv.lproj/InfoPlist.strings'),
      'utf8'
    );
    const en = fs.readFileSync(
      path.join(ROOT, 'ios/App/App/en-GB.lproj/InfoPlist.strings'),
      'utf8'
    );
    assert.match(sv, /NSCameraUsageDescription/);
    assert.match(sv, /använder kameran/);
    assert.match(en, /uses the camera/);
    assert.equal(fs.existsSync(path.join(ROOT, 'ios/App/App/en.lproj')), false);
  });

  it('Xcode project ships sv + en-GB InfoPlist.strings', () => {
    const pbx = fs.readFileSync(
      path.join(ROOT, 'ios/App/App.xcodeproj/project.pbxproj'),
      'utf8'
    );
    assert.match(pbx, /developmentRegion = sv;/);
    assert.match(pbx, /sv\.lproj\/InfoPlist\.strings/);
    assert.match(pbx, /en-GB\.lproj\/InfoPlist\.strings/);
    assert.doesNotMatch(pbx, /en\.lproj\/InfoPlist\.strings/);
    assert.match(pbx, /InfoPlist\.strings in Resources/);
    assert.match(pbx, /MARKETING_VERSION = \d+\.\d+/);
    assert.match(pbx, /CURRENT_PROJECT_VERSION = \d+/);
  });

  it('cap sync patch script keeps sv development region and en-GB localizations', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'scripts/patch-ios-info-plist.mjs'),
      'utf8'
    );
    assert.match(src, /CFBundleDevelopmentRegion',\s*'sv'/);
    assert.match(src, /CFBundleLocalizations',\s*\['sv',\s*'en-GB'\]/);
    assert.match(src, /writeSwedishInfoPlistStrings/);
    assert.match(src, /writeEnGbInfoPlistStrings/);
    assert.match(src, /removeEnglishLproj/);
  });
});
