'use strict';

/**
 * Negative contracts: retired Morgonhus / separate game-world navigation
 * must not be the canonical barn flow when Barnets samling is active.
 * Visual themes (child-theme.js) remain active — see test/child-theme.test.js.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('retired child gameplay — navigation contracts', () => {
  it('SAMLING_WORLDS exposes today/collection/treasure/family/settings only', () => {
    const src = read('public/js/child-worlds.js');
    assert.match(src, /id: 'collection'/);
    assert.match(src, /id: 'treasure'/);
    assert.match(src, /href: '\/child\/treasure'/);
    assert.doesNotMatch(src, /id: 'morgonhus'/);
    assert.doesNotMatch(src, /href: '\/child\/morgonhus'/);
  });

  it('isWorldHubEntryDisabled blocks Morgonhus hub when barnets_samling gate is on', () => {
    const src = read('public/js/child-worlds.js');
    assert.match(src, /function isWorldHubEntryDisabled/);
    assert.match(src, /WorldHub\/Morgonhus/);
    assert.match(src, /return _barnetsSamling/);
    assert.match(src, /isWorldHubEntryDisabled/);
  });

  it('/universe legacy path redirects to canonical child world route', () => {
    const src = read('src/routes/index.js');
    assert.match(src, /app\.get\('\/universe'[\s\S]*redirect\(302, '\/child\/world'\)/);
  });
});

describe('active visual themes — not retired', () => {
  it('child-theme-picker persists visual_theme via API', () => {
    const src = read('public/js/child-theme-picker.js');
    assert.match(src, /visual_theme/);
    assert.match(src, /child_view_config/);
    assert.match(src, /role="radiogroup"/);
    assert.match(src, /setAttribute\('aria-modal', 'true'\)/);
  });

  it('child-theme applies data-child-theme for visual shell only', () => {
    const src = read('public/js/child-theme.js');
    assert.match(src, /data-child-theme/);
    assert.match(src, /visual_theme/);
    assert.doesNotMatch(src, /enterMemoryHall/);
    assert.doesNotMatch(src, /ChildMorgonhus/);
  });
});
