'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('mobile sidebar + photo pick fix', () => {
  it('mobile-nav finds sidebar without id=sidebar', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/mobile-nav.js'), 'utf8');
    assert.match(src, /function findSidebarNav/);
    assert.match(src, /nav\.bg-navy/);
  });

  it('dashboard sidebar hidden on mobile in magic shell', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/dashboard.html'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'public/css/mobile-nav.css'), 'utf8');
    assert.match(html, /id="sidebar"/);
    assert.match(html, /parent-magic-legacy-hide/);
    assert.match(html, /parent-magic-auto\.js/);
    assert.match(css, /has-native-tab-bar nav\.bg-navy/);
  });

  it('platform tries pickImages before getPhoto fallbacks', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/platform.js'), 'utf8');
    assert.match(src, /nativePickWithFallbacks/);
    assert.match(src, /pickViaGallery/);
    assert.match(src, /resultTypes = \['uri', 'base64'\]/);
  });

  it('SW bumped to v293', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
    assert.match(src, /stjarndag-v293/);
  });
});
