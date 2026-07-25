'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('magic nav flash fix', () => {
  it('native tab bar binds tab links for soft navigation', () => {
    const router = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-router.js'), 'utf8');
    const tabBar = fs.readFileSync(path.join(ROOT, 'public/js/native-tab-bar.js'), 'utf8');
    assert.match(tabBar, /a\.tab-item/);
    assert.match(tabBar, /router\.navigateTo\(href\)/);
    assert.match(router, /\/planning': 'planning'/);
    assert.match(router, /\/rewards': 'rewards'/);
    assert.doesNotMatch(router, /classList\.add\('parent-magic-nav-loading'\)/);
  });

  it('swapMain preserves magic chrome', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-router.js'), 'utf8');
    assert.match(src, /preserveIds/);
    assert.match(src, /data-parent-nav-header/);
    assert.doesNotMatch(src, /curMain\.innerHTML = newMain\.innerHTML/);
  });

  it('native tab bar remount without unmount', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/native-tab-bar.js'), 'utf8');
    assert.match(src, /updateActiveTabs/);
    assert.match(src, /stjarndag-magic-navigated/);
    assert.match(src, /navLabelsReady/);
    assert.match(src, /parent-i18n-ready/);
    assert.doesNotMatch(src, /function remount\(\) \{\s*unmount\(\)/);
  });

  it('parent-magic-i18n notifies nav after early session locale apply', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-i18n.js'), 'utf8');
    assert.match(src, /notifyParentI18nReady/);
    assert.match(src, /earlyApply[\s\S]*parent-i18n-ready/);
  });

  it('SW bumped to v293', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
    assert.match(src, /stjarndag-v(?:29[3-9]|[3-9]\d\d|\d{4,})/);
  });
});
