'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('family UI fixes', () => {
  it('family name is collapsed details below adults section', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/family.html'), 'utf8');
    const adultsIdx = html.indexOf('id="adultsGrid"');
    const nameIdx = html.indexOf('id="familyNameSection"');
    assert.ok(adultsIdx >= 0 && nameIdx > adultsIdx);
    assert.match(html, /<details[^>]*id="familyNameSection"/);
    assert.doesNotMatch(html, /id="familyInfoSection"/);
  });

  it('parent header uses safe-area CSS class not inline padding', () => {
    const header = fs.readFileSync(path.join(ROOT, 'public/js/parent-nav-header.js'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'public/css/app-view-toggle.css'), 'utf8');
    assert.doesNotMatch(header, /bar\.style\.cssText/);
    assert.match(css, /\.parent-nav-header-actions/);
    assert.match(css, /safe-area-inset-top/);
  });

  it('platform camera requests photos permission on native', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/platform.js'), 'utf8');
    assert.match(src, /ensurePhotosPermission/);
    assert.match(src, /requestPermissions/);
    assert.match(src, /presentationStyle: 'fullscreen'/);
  });

  it('child profile setup has scroll padding for bottom nav', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/family-child.html'), 'utf8');
    assert.match(html, /scroll-margin-bottom/);
    assert.match(html, /safe-area-inset-bottom/);
  });
});
