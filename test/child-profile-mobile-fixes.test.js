'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('child profile mobile fixes', () => {
  it('native camera pick tries gallery then getPhoto fallbacks', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/platform.js'), 'utf8');
    assert.match(src, /pickViaGallery/);
    assert.match(src, /nativePickWithFallbacks/);
    assert.match(src, /pickImages/);
    assert.match(src, /\['PHOTOS', 'PROMPT', 'CAMERA'\]/);
    assert.match(src, /requestPermissions\(\{ permissions: needCamera \? \['camera', 'photos'\] : \['photos'\] \}\)/);
  });

  it('child profile setup does not force library source', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-profile-setup.js'), 'utf8');
    assert.match(src, /AvatarUploadFlow\.pickCropAndUpload/);
    assert.doesNotMatch(src, /source: 'library'/);
  });

  it('child profile tabs use grid not horizontal scroll', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-profile.js'), 'utf8');
    assert.match(src, /grid grid-cols-3/);
    assert.match(src, /childProfileTabBar/);
    assert.doesNotMatch(src, /overflow-x-auto pb-2 mb-6/);
  });

  it('family-child page clips horizontal overflow', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/family-child.html'), 'utf8');
    assert.match(html, /overflow-x: clip/);
    assert.match(html, /#childProfileSetupBody/);
  });

  it('child profile setup includes birthday picker on Inställningar', () => {
    const setup = fs.readFileSync(path.join(ROOT, 'public/js/child-profile-setup.js'), 'utf8');
    const html = fs.readFileSync(path.join(ROOT, 'public/family-child.html'), 'utf8');
    assert.match(setup, /Födelsedag/);
    assert.match(setup, /BIRTHDAY_PREFIX/);
    assert.match(setup, /initBirthdayPicker\(BIRTHDAY_PREFIX\)/);
    assert.match(setup, /body\.birthday = birthday/);
    assert.match(html, /birthday-picker\.js/);
    assert.match(html, /profile-birthday-select/);
  });

  it('child profile header shows age when birthday is set', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-profile.js'), 'utf8');
    assert.match(src, /child-profile-subtitle/);
    assert.match(src, /formatAge/);
  });

  it('iPad top chrome uses safe-area and tablet width', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/app-view-toggle.css'), 'utf8');
    assert.match(css, /\.parent-top-chrome/);
    assert.match(css, /safe-area-inset-top/);
    assert.match(css, /min-width: 768px/);
    assert.match(css, /html\.platform-native \.parent-nav-header-actions/);
  });

  it('native tab bar uses viewport width on tablet (not pointer coarse)', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/native-tab-bar.js'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'public/css/parent-tab-bar.css'), 'utf8');
    assert.match(js, /max-width: 767px/);
    assert.doesNotMatch(js, /pointer: coarse/);
    assert.match(css, /hover: hover\) and \(pointer: fine\)/);
  });
});
