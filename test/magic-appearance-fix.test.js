const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('magic appearance fixes', () => {
  it('assign-schedule has magic shell mounts and hide-header', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/assign-schedule.html'), 'utf8');
    assert.match(html, /data-magic-page="assign-schedule"/);
    assert.match(html, /id="parentMagicPageMount"/);
    assert.match(html, /parent-magic-hide-header/);
  });

  it('parent-magic-auto merges nav header into toggle wrap', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-auto.js'), 'utf8');
    assert.match(src, /syncTopChrome/);
    assert.match(src, /toggle\.appendChild\(navHeader\)/);
  });

  it('unified top bar flex CSS for magic header', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/app-view-toggle.css'), 'utf8');
    assert.match(css, /app-view-toggle-wrap--has-nav/);
    assert.match(css, /parent-magic-dashboard.*parent-nav-header-actions/);
  });

  it('planning hub page includes magic CSS and auto script', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/planning.html'), 'utf8');
    assert.match(html, /parent-magic-common\.css/);
    assert.match(html, /app-view-toggle\.css/);
    assert.match(html, /parent-magic-auto\.js/);
  });

  it('SW bumped to v294', () => {
    const sw = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
    assert.match(sw, /stjarndag-v294/);
  });

  it('assign-schedule magic contrast CSS', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/parent-magic-common.css'), 'utf8');
    assert.match(css, /parent-magic-page-assign-schedule/);
    assert.match(css, /\.schema-card/);
    assert.match(css, /\.week-label/);
  });

  it('family modals use high z-index', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/family.html'), 'utf8');
    assert.match(html, /id="addAdultModal"[^>]*z-\[9100\]/);
    assert.match(html, /id="childDrawer"[^>]*z-\[9050\]/);
  });

  it('family openFamilyModal closes drawer first', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/family.js'), 'utf8');
    assert.match(src, /function openFamilyModal/);
    assert.match(src, /closeChildDrawer\(\)/);
  });

  it('fixed nav header on magic sub-pages', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/app-view-toggle.css'), 'utf8');
    assert.match(css, /app-view-toggle-wrap--has-nav/);
    assert.match(css, /display:\s*flex/);
  });

});
