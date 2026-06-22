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

  it('logged-in parent skattkammaren redirects to rewards', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/public-pages.js'), 'utf8');
    assert.match(src, /redirect\(302, '\/rewards'\)/);
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

  it('child-settings with id redirects to barnprofil setup', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/index.js'), 'utf8');
    assert.match(src, /child-settings/);
    assert.match(src, /tab=setup/);
  });
});
