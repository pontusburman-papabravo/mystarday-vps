'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('meny v2.3 — billing UI gate', () => {
  it('billing-ui server module respects BILLING_UI_DISABLED', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/lib/billing-ui.js'), 'utf8');
    assert.match(src, /BILLING_UI_DISABLED/);
    assert.match(src, /isBillingUiEnabled/);
  });

  it('subscription status exposes billing_ui_enabled', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/subscription.js'), 'utf8');
    assert.match(src, /billing_ui_enabled/);
  });

  it('pricing-info route gated when billing disabled', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/public-pages.js'), 'utf8');
    assert.match(src, /isBillingUiEnabled/);
    assert.match(src, /pricing-info/);
  });

  it('settings-subscription uses billing_ui_enabled not rollout alone', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/settings-subscription.js'), 'utf8');
    assert.match(src, /billing_ui_enabled/);
    assert.doesNotMatch(src, /rollout_mode[\s\S]*payment_enabled/);
  });

  it('avatar menu hides subscription when BillingUi disabled', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/parent-avatar-menu.js'), 'utf8');
    assert.match(src, /BillingUi\.isEnabled/);
  });
});

describe('meny v2.3 — B8 barnprofil setup inline', () => {
  it('child-profile-setup has photo, view mode, mood, rewards', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-profile-setup.js'), 'utf8');
    assert.match(src, /profileSetupPhotoBtn/);
    assert.match(src, /profileViewClassic/);
    assert.match(src, /profileSetupMood/);
    assert.match(src, /profile-reward-toggle/);
  });

  it('family-child loads child-profile-setup', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/family-child.html'), 'utf8');
    assert.match(html, /child-profile-setup\.js/);
    assert.match(html, /platform\.js/);
  });
});

describe('meny v2.3 — Hem PX2 + H19', () => {
  it('home-bump-time uses bump-time API', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/home-bump-time.js'), 'utf8');
    assert.match(src, /bump-time/);
    assert.match(src, /homeBumpMount/);
  });

  it('dashboard loads home-bump-time and renders after stats', () => {
    const dashJs = fs.readFileSync(path.join(ROOT, 'public/js/dashboard.js'), 'utf8');
    const dashHtml = fs.readFileSync(path.join(ROOT, 'public/dashboard.html'), 'utf8');
    assert.match(dashHtml, /home-bump-time\.js/);
    assert.match(dashHtml, /homeBumpMount/);
    assert.match(dashJs, /HomeBumpTime\.render/);
  });

  it('star history section not legacy-hidden on hem', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/dashboard.html'), 'utf8');
    const line = html.split('\n').find(function (l) { return l.indexOf('starHistorySection') >= 0; });
    assert.ok(line, 'starHistorySection mount missing');
    assert.doesNotMatch(line, /parent-magic-legacy-hide/);
  });
});
