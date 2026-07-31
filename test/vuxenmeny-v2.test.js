'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('vuxenmeny v2 — Sprint 1 nav-config', () => {
  it('nav-config.js defines five primary tabs', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/nav-config.js'), 'utf8');
    assert.match(src, /id: 'home'/);
    assert.match(src, /id: 'planning'/);
    assert.match(src, /id: 'rewards'/);
    assert.match(src, /id: 'for_you'/);
    assert.match(src, /id: 'family'/);
    assert.match(src, /function activeNavItem/);
    assert.doesNotMatch(src, /feature: 'for_dig'/);
  });

  it('native-tab-bar reads NavConfig', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/native-tab-bar.js'), 'utf8');
    assert.match(src, /NavConfig\.primaryNavForTabs/);
    assert.doesNotMatch(src, /ROLLOUT_TABS/);
  });

  it('parent-magic-shell reads NavConfig', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-shell.js'), 'utf8');
    assert.match(src, /NavConfig\.PRIMARY_NAV/);
    assert.doesNotMatch(src, /ROLLOUT_NAV/);
  });

  it('platform-html injects nav-config before tab bar', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/middleware/platform-html.js'), 'utf8');
    assert.match(src, /nav-config\.js/);
    assert.match(src, /\/planning/);
    assert.match(src, /\/rewards/);
  });

  it('session-gate includes planning and rewards', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/session-gate.js'), 'utf8');
    assert.match(src, /'\/planning'/);
    assert.match(src, /'\/rewards'/);
  });
});

describe('vuxenmeny v2 — Sprint 2 hubs & redirects', () => {
  it('planning and rewards HTML exist', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'public/planning.html')));
    assert.ok(fs.existsSync(path.join(ROOT, 'public/rewards.html')));
  });

  it('routes register planning, rewards, family-child', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/index.js'), 'utf8');
    assert.match(src, /'planning'/);
    assert.match(src, /'rewards'/);
    assert.match(src, /'family-child'/);
  });

  it('logged-in parent skattkammaren serves parent treasury page', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/public-pages.js'), 'utf8');
    assert.match(src, /skattkammaren-parent\.html/);
    assert.doesNotMatch(src, /redirect\(302, '\/rewards'\)/);
  });

  it('upgrade redirects to settings prenumeration', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/index.js'), 'utf8');
    assert.match(src, /\/upgrade.*\/settings#prenumeration/s);
  });
});

describe('vuxenmeny v2 — Sprint 3 barnprofil', () => {
  it('child-profile.js implements tabs and quick actions', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-profile.js'), 'utf8');
    assert.match(src, /overview/);
    assert.match(src, /manual-stars/);
    assert.match(src, /pause/);
    assert.match(src, /family\/child/);
  });

  it('child-settings redirects to barnprofil setup tab when child id present', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/index.js'), 'utf8');
    assert.match(src, /child-settings/);
    assert.match(src, /\/family\/child\/\$\{encodeURIComponent\(childId\)\}\?tab=setup/);
    assert.doesNotMatch(src, /child-settings\.html/);
  });
});

describe('vuxenmeny v2 — Sprint 4 settings & avatar', () => {
  it('family.html has no GDPR/delete/PWA/pin sections', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/family.html'), 'utf8');
    assert.doesNotMatch(html, /familyPwaInstallGuide/);
    assert.doesNotMatch(html, /parentPinSection/);
    assert.doesNotMatch(html, /deleteAccountModal/);
    assert.doesNotMatch(html, /openDeleteAccountModal/);
    assert.doesNotMatch(html, /Ladda ner min data/);
  });

  it('settings has prenumeration section and subscription script', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/settings.html'), 'utf8');
    assert.match(html, /id="prenumeration"/);
    assert.match(html, /settings-subscription\.js/);
  });

  it('parent-avatar-menu.js exists and platform-html injects it', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'public/js/parent-avatar-menu.js')));
    const platform = fs.readFileSync(path.join(ROOT, 'src/middleware/platform-html.js'), 'utf8');
    assert.match(platform, /parent-avatar-menu\.js/);
  });

  it('payment-success redirects to settings prenumeration', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/index.js'), 'utf8');
    assert.match(src, /\/payment-success.*\/settings#prenumeration/s);
  });

  it('settings-account parent PIN section uses settings.parentPin i18n keys', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/settings-account.js'), 'utf8');
    const pinBlock = src.slice(src.indexOf('initParentPinSection'), src.indexOf('function buildParentPinSetForm'));
    assert.match(pinBlock, /settings\.parentPin\.title/);
    assert.doesNotMatch(pinBlock, /Föräldralås/);
  });
});

describe('vuxenmeny v2 — Sprint 6 capabilities', () => {
  it('nav-config exports CAPABILITIES and helpers', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/nav-config.js'), 'utf8');
    assert.match(src, /CAPABILITIES/);
    assert.match(src, /AVATAR_ACTIONS/);
    assert.match(src, /capabilitiesForPlacement/);
    assert.match(src, /hasFeatureAccess/);
  });

  it('planning-hub uses capabilitiesForPlacement', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/planning-hub.js'), 'utf8');
    assert.match(src, /NavConfig\.capabilitiesForPlacement/);
    assert.match(src, /planning_hub/);
    assert.match(src, /magic-bilder/);
    assert.match(src, /planning\.links\.library/);
  });

  it('rewards-hub uses capabilitiesForPlacement', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/rewards-hub.js'), 'utf8');
    assert.match(src, /capabilitiesForPlacement/);
    assert.match(src, /rewards_hub/);
  });

  it('native-tab-bar has no Extra or Mer tabs', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/native-tab-bar.js'), 'utf8');
    assert.doesNotMatch(src, /Extra/);
    assert.doesNotMatch(src, /\bMer\b/);
  });
});
