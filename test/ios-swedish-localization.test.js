'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('iOS Swedish App Store localization', () => {
  it('Info.plist declares Swedish-only development region and localizations', () => {
    const plist = fs.readFileSync(path.join(ROOT, 'ios/App/App/Info.plist'), 'utf8');
    assert.match(plist, /<key>CFBundleDevelopmentRegion<\/key>\s*<string>sv<\/string>/);
    assert.match(
      plist,
      /<key>CFBundleLocalizations<\/key>\s*<array>\s*<string>sv<\/string>\s*<\/array>/
    );
    assert.doesNotMatch(plist, /<string>en<\/string>/);
    assert.match(plist, /använder kameran/);
  });

  it('sv InfoPlist.strings exists and en.lproj is absent', () => {
    const sv = fs.readFileSync(
      path.join(ROOT, 'ios/App/App/sv.lproj/InfoPlist.strings'),
      'utf8'
    );
    assert.match(sv, /NSCameraUsageDescription/);
    assert.match(sv, /använder kameran/);
    assert.equal(fs.existsSync(path.join(ROOT, 'ios/App/App/en.lproj')), false);
  });

  it('Xcode project lists Swedish-only regions and ships InfoPlist.strings', () => {
    const pbx = fs.readFileSync(
      path.join(ROOT, 'ios/App/App.xcodeproj/project.pbxproj'),
      'utf8'
    );
    assert.match(pbx, /developmentRegion = sv;/);
    assert.match(pbx, /knownRegions = \(\s*sv,\s*Base,/);
    assert.match(pbx, /sv\.lproj\/InfoPlist\.strings/);
    assert.doesNotMatch(pbx, /en\.lproj\/InfoPlist\.strings/);
    assert.match(pbx, /InfoPlist\.strings in Resources/);
    // Do not pin MARKETING_VERSION / CURRENT_PROJECT_VERSION here — release
    // bumps must not break the Swedish localization contract.
    assert.match(pbx, /MARKETING_VERSION = \d+\.\d+/);
    assert.match(pbx, /CURRENT_PROJECT_VERSION = \d+/);
  });

  it('cap sync patch script keeps Swedish-only localization durable', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'scripts/patch-ios-info-plist.mjs'),
      'utf8'
    );
    assert.match(src, /CFBundleDevelopmentRegion',\s*'sv'/);
    assert.match(src, /CFBundleLocalizations',\s*\['sv'\]/);
    assert.match(src, /writeSwedishInfoPlistStrings/);
    assert.match(src, /removeEnglishLproj/);
    assert.doesNotMatch(src, /writeInfoPlistStrings\('en'/);
  });
});
