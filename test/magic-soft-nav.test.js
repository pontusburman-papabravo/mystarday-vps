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
      'public/js/planning-hub.js',
      'public/js/rewards-hub.js',
    ];
    files.forEach((rel) => {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      assert.match(src, /ParentMagicPageBoot\.register/);
    });
  });

  it('router loads planning and rewards hub scripts on soft nav', () => {
    const router = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-router.js'), 'utf8');
    assert.match(router, /planning:\s*\[['"]\/js\/planning-hub\.js/);
    assert.match(router, /rewards:\s*\[[\s\S]*rewards-hub\.js/);
  });

  it('planning and rewards hubs re-render on magic navigated event', () => {
    const planning = fs.readFileSync(path.join(ROOT, 'public/js/planning-hub.js'), 'utf8');
    const rewards = fs.readFileSync(path.join(ROOT, 'public/js/rewards-hub.js'), 'utf8');
    assert.match(planning, /stjarndag-magic-navigated/);
    assert.match(rewards, /stjarndag-magic-navigated/);
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
    assert.match(dashboard, /stjarndag-magic-navigated/);
  });

  it('magic hub contrast CSS for planning, rewards, settings deletion', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/parent-magic-common.css'), 'utf8');
    assert.match(css, /parent-magic-page-planning/);
    assert.match(css, /parent-magic-page-rewards/);
    assert.match(css, /#deletionSection/);
    assert.match(css, /#medforalderCtaBanner/);
    assert.match(css, /magic-hub-links/);
  });

  it('for-dig boot skips auto-init when ParentMagicPageBoot handles soft nav', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/for-dig.js'), 'utf8');
    assert.match(src, /if \(!document\.getElementById\('forDigGoals'\)\) return/);
    assert.match(src, /ParentMagicPageBoot\.register\('for-dig', init\)/);
    assert.match(src, /_forDigClickBound/);
    assert.doesNotMatch(src, /ParentMagicPageBoot\.register[\s\S]*DOMContentLoaded, init/);
  });

  it('skattkammaren magic contrast CSS present', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/parent-magic-common.css'), 'utf8');
    assert.match(css, /data-magic-page="skattkammaren"/);
    assert.match(css, /#placeholderState/);
  });
});
