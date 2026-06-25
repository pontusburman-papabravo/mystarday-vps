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
    assert.match(src, /ensureTopChrome/);
    assert.match(src, /if \(!navHeader\) return/);
  });

  it('assign-schedule magic contrast CSS', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/parent-magic-common.css'), 'utf8');
    assert.match(css, /parent-magic-page-assign-schedule/);
    assert.match(css, /parent-magic-page-assign-schedule:not\(\.parent-theme-light\)/);
    assert.match(css, /parent-theme-light\.parent-magic-page-assign-schedule \.day-btn/);
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

  it('parent-magic-auto wraps toggle + header in top chrome row', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-auto.js'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'public/css/app-view-toggle.css'), 'utf8');
    assert.match(src, /ensureTopChrome/);
    assert.match(src, /parentTopChrome/);
    assert.match(src, /parent-top-chrome/);
    assert.match(css, /\.parent-top-chrome/);
    assert.match(css, /position: static !important/);
  });

  it('view toggle shares top row with header icons when mounted', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/app-view-toggle.css'), 'utf8');
    assert.doesNotMatch(css, /main:has\(> \.app-view-toggle-wrap:not\(:empty\)\) > \.parent-nav-header-actions/);
    assert.match(css, /\.parent-top-chrome \.parent-nav-header-actions/);
  });

  it('home hub mounts daily summary banner inside magic shell', () => {
    const hub = fs.readFileSync(path.join(ROOT, 'public/js/dashboard-home-hub.js'), 'utf8');
    const summary = fs.readFileSync(path.join(ROOT, 'public/js/dashboard-daily-summary.js'), 'utf8');
    const dash = fs.readFileSync(path.join(ROOT, 'public/js/dashboard.js'), 'utf8');
    assert.match(hub, /parentHubDailySummaryMount/);
    assert.match(summary, /getBannerMount/);
    assert.match(summary, /parentHubDailySummaryMount/);
    assert.match(dash, /DashboardHomeHub\.render\(dashboardStats\);[\s\S]*DashboardDailySummary\.update\(dashboardStats\)/);
  });

  it('coparent CTA readable in light magic home', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/dashboard-magic.css'), 'utf8');
    assert.match(css, /parent-theme-light \.parent-coparent-cta-copy strong/);
  });

  it('fixed nav header on all magic pages including dashboard', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/parent-magic-common.css'), 'utf8');
    const hub = fs.readFileSync(path.join(ROOT, 'public/js/dashboard-home-hub.js'), 'utf8');
    assert.match(css, /parent-top-chrome/);
    assert.match(css, /#parentAvatarBtn/);
    assert.doesNotMatch(hub, /parent-hub-header-actions/);
  });

  it('SW bumped to v339', () => {
    const sw = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
    assert.match(sw, /stjarndag-v(?:339|[3-9]\d\d|\d{4,})/);
  });
});
