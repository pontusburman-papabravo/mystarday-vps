'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('family UI + avatar menu fix', () => {
  it('parent shell uses parent-nav-header for top chrome', () => {
    const header = fs.readFileSync(path.join(ROOT, 'public/js/parent-nav-header.js'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'public/css/app-view-toggle.css'), 'utf8');
    assert.match(header, /data-parent-nav-header/);
    assert.match(header, /HEADER_ACTIONS/);
    assert.match(css, /#parentAvatarMenu\.parent-avatar-menu-dropdown/);
  });

  it('family child card links to barnprofil — no delete on card', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/family.js'), 'utf8');
    assert.match(src, /family-child-card/);
    assert.match(src, /\/family\/child\//);
    assert.doesNotMatch(src, /Ta bort barn[\s\S]*?child-card-wrap/);
  });

  it('family museum has dedicated styles', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/family.html'), 'utf8');
    const museum = fs.readFileSync(path.join(ROOT, 'public/js/family-museum.js'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'public/css/family-museum.css'), 'utf8');
    assert.match(html, /family-museum\.css/);
    assert.match(museum, /fm-museum-reward-chip/);
    assert.match(css, /\.fm-museum-card/);
    assert.match(css, /parent-magic-view.*\.fm-museum-card|body\.parent-magic-view.*\.fm-museum-card/);
  });

  it('notifications legacy header hidden in magic', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/notifications.html'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'public/css/parent-magic-common.css'), 'utf8');
    assert.match(html, /parent-magic-legacy-hide/);
    assert.match(css, /parent-magic-page-notifications/);
  });

  it('SW bumped to v293', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
    assert.match(src, /stjarndag-v(?:29[3-9]|[3-9]\d\d|\d{4,})/);
  });
});
