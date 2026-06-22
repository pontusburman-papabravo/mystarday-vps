'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('tablet magic navigation', () => {
  it('native-tab-bar only mounts on mobile viewport', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/native-tab-bar.js'), 'utf8');
    assert.match(src, /isMobileViewport/);
    assert.match(src, /max-width: 767px/);
    assert.match(src, /if \(!isMobileViewport\(\)\) return false/);
    assert.match(src, /stjarndag-parent-nav-layout/);
  });

  it('parent-magic-shell ignores hidden native tab bar on tablet', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-shell.js'), 'utf8');
    assert.match(src, /function isNativeTabBarActive/);
    assert.match(src, /if \(isNativeTabBarActive\(\)\)/);
    assert.match(src, /MOBILE_NAV_MQ \? MOBILE_NAV_MQ\.matches : false/);
  });

  it('magic view positions help and feedback above bottom dock', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/parent-magic-common.css'), 'utf8');
    assert.match(css, /body\.parent-magic-view #globalFeedbackBtn/);
    assert.match(css, /body\.parent-magic-view #helpBtn/);
    assert.match(css, /calc\(56px \+ env\(safe-area-inset-bottom/);
  });

  it('upgrade page uses scrollable layout and distinct package grid', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/upgrade.html'), 'utf8');
    const js = fs.readFileSync(path.join(ROOT, 'public/js/upgrade-packages.js'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'public/css/preview-shell.css'), 'utf8');
    assert.match(html, /overflow-y-auto/);
    assert.match(js, /upgrade-package-grid/);
    assert.match(css, /\.upgrade-package-grid/);
  });

  it('dashboard re-renders home hub when toggling classic to magic', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/dashboard.js'), 'utf8');
    assert.match(src, /ParentMagicShell\.init\('dashboard'\)/);
    assert.match(src, /Always re-render dashboard layout on classic↔magic toggle/);
    assert.match(src, /DashboardHomeHub\.render\(dashboardStats\)/);
    const initIdx = src.indexOf("ParentMagicShell.init('dashboard')");
    const onChangeIdx = src.indexOf('Always re-render dashboard layout');
    assert.ok(initIdx >= 0 && onChangeIdx > initIdx, 'view-mode handler should follow ParentMagicShell.init');
  });

  it('platform-html injects apple-sign-in-diagnostics on all HTML pages', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/middleware/platform-html.js'), 'utf8');
    assert.match(src, /apple-sign-in-diagnostics\.js/);
  });

  it('app-view-mode applies optimistic magic before auth/me fetch', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/app-view-mode.js'), 'utf8');
    assert.match(src, /applyStoredParentModeOptimistic/);
    assert.match(src, /_optimisticMagic/);
    assert.match(src, /parent-magic-early/);
  });

  it('platform-html injects early magic class script in head', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/middleware/platform-html.js'), 'utf8');
    assert.match(src, /injectEarlyMagicHtml/);
    assert.match(src, /parent-magic-early-boot/);
    assert.match(src, /parent-magic-early-style/);
    assert.match(src, /stjarndag_parent_ui_view/);
  });

  it('parent-magic-common fixes För dig contrast on light panels', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/parent-magic-common.css'), 'utf8');
    assert.match(css, /\.for-dig-most-installed/);
    assert.match(css, /body\.parent-magic-view\.for-dig-page \.text-navy/);
  });
});
