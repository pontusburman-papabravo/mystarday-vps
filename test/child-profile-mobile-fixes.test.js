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
    assert.match(src, /Platform\.camera\.pick\(\{ quality: 'medium' \}\)/);
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

  it('iPad keeps safe-area on header and touch tablets', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/app-view-toggle.css'), 'utf8');
    assert.match(css, /pointer: coarse/);
    assert.match(css, /hover: hover\) and \(pointer: fine\)/);
    assert.match(css, /html\.platform-native \.parent-nav-header-actions/);
    assert.match(css, /position: sticky/);
  });

  it('native tab bar stays on touch tablets', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/native-tab-bar.js'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'public/css/parent-tab-bar.css'), 'utf8');
    assert.match(js, /pointer: coarse/);
    assert.match(css, /hover: hover\) and \(pointer: fine\)/);
  });
});
