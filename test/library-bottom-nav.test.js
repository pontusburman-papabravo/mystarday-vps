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

  it('parent-magic-shell hides bottom nav when NavConfig returns no items', () => {
    const shell = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-shell.js'), 'utf8');
    assert.match(shell, /if \(!items\.length\)/);
    assert.match(shell, /nav\.hidden = true/);
    assert.match(shell, /NavConfig missing or empty/);
    assert.doesNotMatch(shell, /nav\.removeAttribute\('hidden'\)/);
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

  it('library magic hub uses beloningar icon for rewards section chrome', () => {
    const hub = fs.readFileSync(path.join(ROOT, 'public/js/library-magic-hub.js'), 'utf8');
    assert.match(hub, /icon: 'beloningar'/);
    assert.match(hub, /chromeSectionIcon/);
    assert.match(hub, /notifyParentNavRefresh/);
  });

  it('library rewards hash highlights Belöningar in bottom nav', () => {
    const nav = fs.readFileSync(path.join(ROOT, 'public/js/nav-config.js'), 'utf8');
    assert.match(nav, /libraryHashNavOverride/);
    assert.match(nav, /magic-rewards/);
  });

  it('library.html does not ship legacy sidebar or mobile-nav scrape', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/library.html'), 'utf8');
    assert.match(html, /data-magic-page="library"/);
    assert.doesNotMatch(html, /Veckoschema[\s\S]*sidebar-nav/);
    assert.doesNotMatch(html, /mobile-nav\.js/);
  });

  it('calendar.html uses NavConfig shell without legacy mobile-nav', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/calendar.html'), 'utf8');
    assert.match(html, /data-magic-page="calendar"/);
    assert.match(html, /id="parentBottomNav"/);
    assert.doesNotMatch(html, /mobile-nav\.js/);
    assert.doesNotMatch(html, /Min panel/);
  });

  it('schedule.html uses NavConfig shell without legacy mobile-nav', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/schedule.html'), 'utf8');
    assert.match(html, /data-magic-page="schedule"/);
    assert.match(html, /id="parentBottomNav"/);
    assert.doesNotMatch(html, /mobile-nav\.js/);
    assert.doesNotMatch(html, /Veckoschema[\s\S]*sidebar-nav/);
  });

  it('mobile-nav skips parent magic shell paths (no legacy sidebar scrape)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/mobile-nav.js'), 'utf8');
    assert.match(src, /isParentMagicShellPath/);
    assert.match(src, /if \(isParentMagicShellPath\(\)\) return/);
    assert.match(src, /'\/library'/);
    assert.match(src, /'\/calendar'/);
    assert.match(src, /'\/schedule'/);
  });
});
