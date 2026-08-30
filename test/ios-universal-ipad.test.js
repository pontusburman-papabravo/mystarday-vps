'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('iOS universal iPad support', () => {
  it('Xcode project targets iPhone and iPad (universal)', () => {
    const pbx = fs.readFileSync(
      path.join(ROOT, 'ios/App/App.xcodeproj/project.pbxproj'),
      'utf8'
    );
    assert.match(pbx, /TARGETED_DEVICE_FAMILY = "1,2"/);
    assert.doesNotMatch(pbx, /TARGETED_DEVICE_FAMILY = 1;/);
  });

  it('Info.plist does not force iPhone-only compatibility mode', () => {
    const plist = fs.readFileSync(path.join(ROOT, 'ios/App/App/Info.plist'), 'utf8');
    assert.doesNotMatch(plist, /<key>UIRequiresFullScreen<\/key>/);
  });

  it('platform-html injects tablet layout CSS', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/middleware/platform-html.js'), 'utf8');
    assert.match(src, /platform-tablet\.css/);
  });

  it('platform-tablet.css widens magic hub on tablet', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/platform-tablet.css'), 'utf8');
    assert.match(css, /parent-home-hub/);
    assert.match(css, /min-width: 768px/);
    assert.match(css, /#dashTourCard/);
  });

  it('iOS marketing version is 1.4.3 build 30', () => {
    const pbx = fs.readFileSync(
      path.join(ROOT, 'ios/App/App.xcodeproj/project.pbxproj'),
      'utf8'
    );
    assert.match(pbx, /MARKETING_VERSION = 1\.4\.3;/);
    assert.match(pbx, /CURRENT_PROJECT_VERSION = 30;/);
  });

  it('native tab bar uses viewport width only (not pointer coarse)', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/native-tab-bar.js'), 'utf8');
    assert.match(js, /max-width: 767px/);
    assert.doesNotMatch(js, /pointer: coarse/);
  });
});
