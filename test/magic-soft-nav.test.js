const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('magic soft navigation', () => {
  it('parent-magic-router intercepts bottom nav in magic mode', () => {
    const router = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-router.js'), 'utf8');
    const shell = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-shell.js'), 'utf8');
    const boot = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-page-boot.js'), 'utf8');
    const platform = fs.readFileSync(path.join(ROOT, 'src/middleware/platform-html.js'), 'utf8');

    assert.match(router, /ParentMagicRouter/);
    assert.match(router, /navigateTo/);
    assert.match(router, /#parentBottomNav/);
    assert.match(router, /pushState/);
    assert.match(router, /shouldSoftNav/);
    assert.match(router, /\/upgrade/);
    assert.match(shell, /navigateToPage/);
    assert.match(shell, /ParentMagicRouter\.bind/);
    assert.match(boot, /ensureScripts/);
    assert.match(platform, /injectParentMagicRouter/);
  });

  it('page boot handlers registered for shell destinations', () => {
    const files = [
      'public/js/for-dig.js',
      'public/js/schedule.js',
      'public/js/dashboard.js',
      'public/js/upgrade-packages.js',
      'public/js/skattkammaren-parent-page.js',
      'public/js/family.js',
    ];
    files.forEach((rel) => {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      assert.match(src, /ParentMagicPageBoot\.register/);
    });
  });

  it('schedule boot guards logoutBtn missing in magic view', () => {
    const schedule = fs.readFileSync(path.join(ROOT, 'public/js/schedule.js'), 'utf8');
    assert.match(schedule, /getElementById\('logoutBtn'\)/);
    assert.match(schedule, /if \(logoutBtn\)/);
    assert.match(schedule, /_schedulePageBound/);
  });

  it('dashboard soft-nav boot resets overview and renders hub', () => {
    const dashboard = fs.readFileSync(path.join(ROOT, 'public/js/dashboard.js'), 'utf8');
    assert.match(dashboard, /bootDashboardMagicPage/);
    assert.match(dashboard, /childrenListView/);
    assert.match(dashboard, /DashboardHomeHub\.render\(dashboardStats\)/);
    assert.match(dashboard, /showMedforalderCtaIfEligible/);
  });

  it('skattkammaren magic contrast CSS present', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/parent-magic-common.css'), 'utf8');
    assert.match(css, /data-magic-page="skattkammaren"/);
    assert.match(css, /#placeholderState/);
  });
});
