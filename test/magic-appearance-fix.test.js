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

  it('parent-magic-auto reorders nav header after toggle', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-auto.js'), 'utf8');
    assert.match(src, /data-parent-nav-header/);
    assert.match(src, /insertBefore\(navHeader/);
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
    const css = fs.readFileSync(path.join(ROOT, 'public/css/parent-magic-common.css'), 'utf8');
    assert.match(css, /parent-magic-view:not\(\.parent-magic-dashboard\).*parent-nav-header-actions/);
    assert.match(css, /position:\s*fixed/);
  });

  it('SW bumped to v291', () => {
    const sw = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
    assert.match(sw, /stjarndag-v291/);
  });
});
