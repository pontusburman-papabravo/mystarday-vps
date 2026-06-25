'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('magic shell assets on all parent pages', () => {
  it('platform-html ensures CSS/JS even when parent-magic-shell.js is embedded', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/middleware/platform-html.js'), 'utf8');
    assert.match(src, /ensureMagicShellAssets/);
    assert.match(src, /parent-magic-auto\.js/);
    assert.match(src, /app-view-toggle\.css/);
  });

  it('planning.html includes parent-magic-auto and toggle CSS', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/planning.html'), 'utf8');
    assert.match(html, /parent-magic-auto\.js/);
    assert.match(html, /app-view-toggle\.css/);
    assert.match(html, /parent-magic-common\.css/);
  });

  it('rewards.html includes parent-magic-auto and toggle CSS', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/rewards.html'), 'utf8');
    assert.match(html, /parent-magic-auto\.js/);
    assert.match(html, /app-view-toggle\.css/);
  });

  it('parent-magic-router intercepts all soft-nav parent links', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-router.js'), 'utf8');
    assert.match(src, /closest\('a\[href\^="\/"\]'\)/);
    assert.match(src, /syncLegacyNavHide/);
  });

  it('settings hub resets group menu on each entry', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-page-hubs.js'), 'utf8');
    assert.match(src, /resetSettingsState/);
    assert.match(src, /page === 'settings'/);
  });
});
