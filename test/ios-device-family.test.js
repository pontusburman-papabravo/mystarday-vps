'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('iOS device family (phone-primary)', () => {
  it('Xcode project targets iPhone only, not universal iPad', () => {
    const pbx = fs.readFileSync(
      path.join(ROOT, 'ios/App/App.xcodeproj/project.pbxproj'),
      'utf8'
    );
    assert.match(pbx, /TARGETED_DEVICE_FAMILY = 1;/);
    assert.doesNotMatch(pbx, /TARGETED_DEVICE_FAMILY = "1,2"/);
  });

  it('Info.plist opts into iPhone compatibility mode on iPad', () => {
    const plist = fs.readFileSync(path.join(ROOT, 'ios/App/App/Info.plist'), 'utf8');
    assert.match(plist, /<key>UIRequiresFullScreen<\/key>/);
    assert.match(plist, /<true\/>/);
  });
});
