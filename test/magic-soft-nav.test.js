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
    assert.match(router, /closest\('a\[href\^="\/"\]'\)/);
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
      'public/js/calendar-page.js',
    ];
    files.forEach((rel) => {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      assert.match(src, /ParentMagicPageBoot\.register/);
    });
  });

  it('family soft nav loads custody-settings for boendeschema', () => {
    const router = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-router.js'), 'utf8');
    const familyBlock = router.match(/family:\s*\[([\s\S]*?)\]/);
    assert.ok(familyBlock, 'family PAGE_SCRIPTS block');
    assert.match(familyBlock[0], /custody-settings\.js/);
    const custodyIdx = familyBlock[0].indexOf('custody-settings.js');
    const familyJsIdx = familyBlock[0].indexOf('family.js');
    assert.ok(custodyIdx >= 0 && familyJsIdx > custodyIdx, 'custody-settings must load before family.js');
    const planning = fs.readFileSync(path.join(ROOT, 'public/js/planning-hub.js'), 'utf8');
    const familyHtml = fs.readFileSync(path.join(ROOT, 'public/family.html'), 'utf8');
    assert.match(planning, /custodyScheduleSection/);
    assert.match(familyHtml, /id="custodyScheduleSection"/);
  });

  it('router loads planning and rewards hub scripts on soft nav', () => {
    const router = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-router.js'), 'utf8');
    assert.match(router, /planning:\s*\[[\s\S]*planning-hub\.js/);
    assert.match(router, /rewards:\s*\[[\s\S]*rewards-hub\.js/);
  });

  it('soft nav loads dom-utils before page scripts (renderChildAvatar on family)', () => {
    const router = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-router.js'), 'utf8');
    assert.match(router, /SHARED_SCRIPTS[\s\S]*dom-utils\.js/);
    const sharedIdx = router.indexOf('ensureScripts(SHARED_SCRIPTS)');
    const pageIdx = router.indexOf('ensureScripts(PAGE_SCRIPTS[pageId]');
    assert.ok(sharedIdx >= 0 && pageIdx > sharedIdx, 'SHARED_SCRIPTS must load before PAGE_SCRIPTS');
    const family = fs.readFileSync(path.join(ROOT, 'public/js/family.js'), 'utf8');
    assert.match(family, /function childAvatarHtml\(child, size\)/);
    assert.match(family, /_domRenderChildAvatar/);
    assert.doesNotMatch(family, /function renderChildAvatar\(child, size\)/);
  });

  it('planning and rewards hubs re-render on magic navigated event', () => {
    const planning = fs.readFileSync(path.join(ROOT, 'public/js/planning-hub.js'), 'utf8');
    const rewards = fs.readFileSync(path.join(ROOT, 'public/js/rewards-hub.js'), 'utf8');
    const family = fs.readFileSync(path.join(ROOT, 'public/js/family.js'), 'utf8');
    assert.match(planning, /stjarndag-magic-navigated/);
    assert.match(rewards, /stjarndag-magic-navigated/);
    assert.match(family, /stjarndag-magic-navigated/);
    assert.match(family, /pageId !== 'family'/);
  });

  it('schedule boot guards logoutBtn missing in magic view', () => {
    const schedule = fs.readFileSync(path.join(ROOT, 'public/js/schedule.js'), 'utf8');
    assert.match(schedule, /getElementById\('logoutBtn'\)/);
    assert.match(schedule, /if \(logoutBtn\)/);
    assert.match(schedule, /_schedulePageBound/);
  });

  it('calendar page parses children via apiFetch response json', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/js/calendar-page.js'), 'utf8');
    assert.match(html, /await res\.json\(\)/);
    assert.match(html, /window\.apiFetch\('\/api\/children'\)/);
  });

  it('planning hub deep links force full page load', () => {
    const planning = fs.readFileSync(path.join(ROOT, 'public/js/planning-hub.js'), 'utf8');
    const router = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-router.js'), 'utf8');
    assert.match(planning, /data-full-load="1"/);
    assert.match(router, /data-full-load/);
    assert.match(router, /isFullLoadPath/);
  });

  it('schedule is not soft-navigated (full page load only)', () => {
    const router = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-router.js'), 'utf8');
    assert.doesNotMatch(router, /['"]\/schedule['"]:\s*'schedule'/);
    assert.match(router, /FULL_LOAD_PATHS/);
    assert.match(router, /['"]\/schedule['"]:\s*true/);
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

  it('soft nav applies body classes before swap and renders settings chrome after boot', () => {
    const router = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-router.js'), 'utf8');
    const idxApply = router.indexOf('applyBodyFromPage(doc, pageId)');
    const idxSwap = router.indexOf('swapMain(doc)');
    assert.ok(idxApply >= 0 && idxSwap > idxApply, 'applyBodyFromPage must run before swapMain');
    assert.match(router, /pageId === 'settings'[\s\S]*ensureSettingsChrome/);
    assert.doesNotMatch(router, /hubMount\.innerHTML = ''/);
  });

  it('top chrome keeps icons visible when toggle is empty', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/app-view-toggle.css'), 'utf8');
    assert.doesNotMatch(css, /parent-top-chrome:has\(\.app-view-toggle-wrap:empty\) \{\s*display: none/);
    assert.match(css, /justify-content: flex-end/);
  });

  it('for-dig init ignores stale soft-nav runs', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/for-dig.js'), 'utf8');
    assert.match(src, /_forDigInitGen/);
    assert.match(src, /gen !== _forDigInitGen/);
  });

  it('settings group CSS respects .hidden when showing one group', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/parent-magic-common.css'), 'utf8');
    assert.match(css, /magic-settings-in-group \[data-magic-settings-content\]:not\(\.hidden\)/);
    assert.match(css, /parent-magic-page-settings:not\(\.magic-settings-in-group\) main > \.flex-1\.overflow-auto/);
    assert.match(css, /#parentMagicPageMount:not\(:empty\)/);
  });

  it('settings page uses manual i18n boot to avoid double refresh races', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/settings.html'), 'utf8');
    assert.match(html, /data-i18n-manual-init="true"/);
    assert.match(html, /reinforceSettingsMenu/);
  });

  it('settings is a parent shell path for bottom nav', () => {
    const nav = fs.readFileSync(path.join(ROOT, 'public/js/nav-config.js'), 'utf8');
    assert.match(nav, /PARENT_SHELL_PATHS[\s\S]*'\/settings'/);
    assert.match(nav, /SETTINGS_NAV\.paths/);
  });

  it('settings native nav supports mobile web escape hatch', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/settings-native-nav.js'), 'utf8');
    assert.match(src, /isMobileWeb/);
    assert.match(src, /shouldShowEscapeHatch/);
    assert.match(src, /stjarndag-magic-navigated/);
  });

  it('settings page re-syncs chrome after magic init', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/settings.html'), 'utf8');
    const hubs = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-page-hubs.js'), 'utf8');
    const router = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-router.js'), 'utf8');
    const shell = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-shell.js'), 'utf8');
    assert.match(html, /ensureSettingsChrome/);
    assert.match(hubs, /ensureSettingsChrome/);
    assert.match(hubs, /showSettingsRootMenu/);
    assert.match(hubs, /hasSettingsDeepLink/);
    assert.match(hubs, /isSettingsDomPage/);
    assert.match(hubs, /stjarndag-magic-navigated/);
    assert.match(router, /pageId === 'settings'[\s\S]*ensureSettingsChrome/);
    assert.doesNotMatch(router, /hubMount\.innerHTML = ''/);
    assert.match(hubs, /hash === 'aviseringar'/);
    assert.match(hubs, /data-profile-switch-settings/);
    assert.match(hubs, /hydrateParentSessionFromCookies/);
    assert.match(shell, /syncPageFromDom/);
  });

  it('family hub does not duplicate header settings link', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/family.html'), 'utf8');
    const header = fs.readFileSync(path.join(ROOT, 'public/js/parent-nav-header.js'), 'utf8');
    assert.doesNotMatch(html, /family-hub-intro[\s\S]*href="\/settings"/);
    assert.match(header, /action\.id === 'settings' && path === '\/settings'/);
  });

  it('auth hydrates parent session from cookies for chrome scripts', () => {
    const auth = fs.readFileSync(path.join(ROOT, 'public/js/auth.js'), 'utf8');
    const chrome = fs.readFileSync(path.join(ROOT, 'public/js/profile-switch-chrome.js'), 'utf8');
    assert.match(auth, /hydrateParentSessionFromCookies/);
    assert.match(chrome, /hydrateParentSessionFromCookies/);
  });

  it('settings uses full page load (not soft-nav) due to inline init', () => {
    const router = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-router.js'), 'utf8');
    const header = fs.readFileSync(path.join(ROOT, 'public/js/parent-nav-header.js'), 'utf8');
    assert.doesNotMatch(router, /['"]\/settings['"]:\s*'settings'/);
    assert.match(router, /['"]\/settings['"]:\s*true/);
    assert.match(header, /\/settings/);
  });

  it('settings back clears hash so profile group does not reopen', () => {
    const hubs = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-page-hubs.js'), 'utf8');
    const family = fs.readFileSync(path.join(ROOT, 'public/family.html'), 'utf8');
    assert.match(hubs, /clearSettingsHash/);
    assert.match(hubs, /skipHash/);
    assert.match(hubs, /returnToSettingsMenu/);
    assert.match(hubs, /settings\.appearance\.backToSettings/);
    assert.match(hubs, /bindSettingsDelegation/);
    assert.match(family, /href="\/settings"/);
    assert.doesNotMatch(family, /href="\/settings#profil"/);
  });

  it('magic settings tags prenumeration and handles hash', () => {
    const hubs = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-page-hubs.js'), 'utf8');
    const html = fs.readFileSync(path.join(ROOT, 'public/settings.html'), 'utf8');
    assert.match(hubs, /tagChild\('prenumeration', 'profile'\)/);
    assert.match(hubs, /openFromHash/);
    assert.match(html, /id="settingsLegalSection"/);
    assert.match(html, /data-magic-page="settings"/);
  });

  it('theme picker uses document delegation for mobile + soft-nav', () => {
    const hubs = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-page-hubs.js'), 'utf8');
    assert.match(hubs, /bindThemePickerDelegation/);
    assert.match(hubs, /handleThemePickerActivate/);
    assert.match(hubs, /magicAppearanceSection/);
    assert.match(hubs, /addEventListener\('click', handleThemePickerActivate, true\)/);
  });

  it('for-dig boot skips auto-init when ParentMagicPageBoot handles soft nav', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/for-dig.js'), 'utf8');
    assert.match(src, /if \(!document\.getElementById\('forDigGoals'\)\) return/);
    assert.match(src, /ParentMagicPageBoot\.register\('for-dig', init\)/);
    assert.match(src, /_forDigClickBound/);
    assert.match(src, /stjarndag-magic-navigated/);
    assert.match(src, /registerPageBoot/);
    assert.doesNotMatch(src, /DOMContentLoaded, init/);
  });

  it('for-dig auth guard only redirects on 401/403', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/for-dig.js'), 'utf8');
    assert.match(src, /res\.status === 401 \|\| res\.status === 403/);
  });

  it('soft nav follows server redirect for gated HTML pages', () => {
    const router = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-router.js'), 'utf8');
    assert.match(router, /finalPath !== path/);
    assert.match(router, /res\.url/);
  });

  it('magic bootstrap runs page boot after shell init', () => {
    const bootstrap = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-bootstrap.js'), 'utf8');
    assert.match(bootstrap, /ParentMagicPageBoot\.run\(page\)/);
  });

  it('skattkammaren magic contrast CSS present', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/parent-magic-common.css'), 'utf8');
    assert.match(css, /data-magic-page="skattkammaren"/);
    assert.match(css, /#placeholderState/);
  });

  it('skattkammaren treasury CSS loaded on soft-nav', () => {
    const router = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-router.js'), 'utf8');
    assert.match(router, /skattkammaren:\s*\[['"]\/css\/skattkammaren-parent\.css/);
    assert.ok(fs.existsSync(path.join(ROOT, 'public/css/skattkammaren-parent.css')));
  });
});
