'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('library bottom nav isolation', () => {
  it('library.html does not ship legacy emoji bottom-nav links', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/library.html'), 'utf8');
    assert.match(html, /id="parentBottomNav"/);
    assert.doesNotMatch(html, /parent-bottom-nav-btn[\s\S]*🏠/);
    assert.doesNotMatch(html, /href="\/schedule"[\s\S]*parent-bottom-nav-btn/);
    assert.doesNotMatch(html, /href="\/settings"[\s\S]*parent-bottom-nav-btn/);
  });

  it('dashboard.html does not ship legacy emoji bottom-nav links', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/dashboard.html'), 'utf8');
    assert.match(html, /id="parentBottomNav"/);
    assert.doesNotMatch(html, /parent-bottom-nav-btn[\s\S]*🏠/);
    assert.doesNotMatch(html, /href="\/schedule"[\s\S]*parent-bottom-nav-btn/);
  });

  it('nav-config exposes isLibraryPath', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/nav-config.js'), 'utf8');
    assert.match(src, /function isLibraryPath/);
    assert.match(src, /isLibraryPath: isLibraryPath/);
  });

  it('leaving /library hard-navigates instead of soft-swapping primary tabs', () => {
    const router = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-router.js'), 'utf8');
    const tabs = fs.readFileSync(path.join(ROOT, 'public/js/native-tab-bar.js'), 'utf8');
    const shell = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-shell.js'), 'utf8');
    assert.match(router, /normalizePath\(global\.location\.pathname\) === '\/library'/);
    assert.match(router, /hardNavigateFromLibrary/);
    assert.match(tabs, /NavConfig\.isLibraryPath/);
    assert.match(shell, /NavConfig\.isLibraryPath/);
  });

  it('native tab bar remounts on soft navigation for correct active icons', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/native-tab-bar.js'), 'utf8');
    assert.match(src, /function updateActiveTabs\(\) \{\s*remount\(\);/);
  });

  it('library magic hub refreshes parent shell after layout', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/library-magic-hub.js'), 'utf8');
    assert.match(src, /ParentMagicShell\.refresh/);
  });
});
