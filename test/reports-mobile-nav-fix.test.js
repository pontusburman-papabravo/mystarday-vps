'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('reports mobile nav fix', () => {
  it('reports page header is not nav.bg-navy sidebar', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/reports.html'), 'utf8');
    assert.match(html, /data-page-header/);
    assert.match(html, /reports-topbar/);
    assert.doesNotMatch(html, /<nav class="w-full bg-navy/);
  });

  it('parent-nav-sidebar only targets #sidebar', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/parent-nav-sidebar.js'), 'utf8');
    assert.match(src, /getElementById\('sidebar'\)/);
    assert.doesNotMatch(src, /querySelector\('nav\.bg-navy'\)/);
  });

  it('mobile-nav only targets #sidebar', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/mobile-nav.js'), 'utf8');
    assert.match(src, /getElementById\('sidebar'\)/);
    assert.doesNotMatch(src, /querySelector\('nav\.bg-navy'\)/);
  });

  it('native tab bar does not use nav.bg-navy as shell detector', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/native-tab-bar.js'), 'utf8');
    assert.doesNotMatch(src, /querySelector\('nav\.bg-navy'\)/);
    assert.match(src, /isParentShellPath/);
  });
});
