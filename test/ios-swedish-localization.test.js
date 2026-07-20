'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('iOS Swedish App Store localization', () => {
  it('Info.plist declares Swedish development region and localizations', () => {
    const plist = fs.readFileSync(path.join(ROOT, 'ios/App/App/Info.plist'), 'utf8');
    assert.match(plist, /<key>CFBundleDevelopmentRegion<\/key>\s*<string>sv<\/string>/);
    assert.match(plist, /<key>CFBundleLocalizations<\/key>\s*<array>[\s\S]*?<string>sv<\/string>[\s\S]*?<string>en<\/string>[\s\S]*?<\/array>/);
    assert.match(plist, /använder kameran/);
  });

  it('sv and en InfoPlist.strings exist with permission copy', () => {
    const sv = fs.readFileSync(
      path.join(ROOT, 'ios/App/App/sv.lproj/InfoPlist.strings'),
      'utf8'
    );
    const en = fs.readFileSync(
      path.join(ROOT, 'ios/App/App/en.lproj/InfoPlist.strings'),
      'utf8'
    );
    assert.match(sv, /NSCameraUsageDescription/);
    assert.match(sv, /använder kameran/);
    assert.match(en, /NSCameraUsageDescription/);
    assert.match(en, /uses the camera/);
  });

  it('Xcode project lists sv known region and ships InfoPlist.strings', () => {
    const pbx = fs.readFileSync(
      path.join(ROOT, 'ios/App/App.xcodeproj/project.pbxproj'),
      'utf8'
    );
    assert.match(pbx, /developmentRegion = sv;/);
    assert.match(pbx, /knownRegions = \(\s*en,\s*sv,\s*Base,/);
    assert.match(pbx, /sv\.lproj\/InfoPlist\.strings/);
    assert.match(pbx, /en\.lproj\/InfoPlist\.strings/);
    assert.match(pbx, /InfoPlist\.strings in Resources/);
    assert.match(pbx, /CURRENT_PROJECT_VERSION = 24;/);
  });

  it('cap sync patch script keeps Swedish localization durable', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'scripts/patch-ios-info-plist.mjs'),
      'utf8'
    );
    assert.match(src, /CFBundleDevelopmentRegion',\s*'sv'/);
    assert.match(src, /CFBundleLocalizations/);
    assert.match(src, /writeInfoPlistStrings\('sv'/);
    assert.match(src, /writeInfoPlistStrings\('en'/);
  });
});
