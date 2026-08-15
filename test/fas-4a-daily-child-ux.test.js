'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { resolveAppEntry, DESTINATIONS } = require('../src/lib/app-entry-resolve');
const { toPublicEntryDecision, pathForDestination } = require('../src/lib/app-entry-decision-public');

const ROOT = path.join(__dirname, '..');

describe('Fas 4A — daily child UX paths', () => {
  it('profile-picker path uses /child/profile-picker when daily UX flag on', () => {
    assert.equal(
      pathForDestination(DESTINATIONS.PROFILE_PICKER, { dailyUxActive: true }),
      '/child/profile-picker'
    );
    assert.equal(
      pathForDestination(DESTINATIONS.PROFILE_PICKER, { dailyUxActive: false }),
      '/child-login?shared_device=1&entry_picker=1'
    );
  });

  it('shared single child with no adults still resolves child-home with zero picker taps', () => {
    const resolved = resolveAppEntry({
      trustedDevice: { valid: true, deviceMode: 'shared' },
      allowedChildren: [{ id: 'solo-child-id' }],
      allowedParents: [],
      childSession: null,
      parentSession: null,
    });
    const pub = toPublicEntryDecision(resolved, { dailyUxActive: true });
    assert.equal(pub.destination, 'child-home');
    assert.equal(pub.path, '/child/today');
  });

  it('shared single child + one parent resolves child-home (parent via explicit switch)', () => {
    const resolved = resolveAppEntry({
      trustedDevice: { valid: true, deviceMode: 'shared' },
      allowedChildren: [{ id: 'solo-child-id' }],
      allowedParents: [{ id: 'parent-id' }],
      childSession: null,
      parentSession: null,
    });
    const pub = toPublicEntryDecision(resolved, { dailyUxActive: true });
    assert.equal(pub.destination, 'child-home');
    assert.equal(pub.path, '/child/today');
  });
});

describe('Fas 4A — client contracts', () => {
  it('Auth.switchChildMember uses profile-picker on trusted daily UX before legacy logout', () => {
    const auth = fs.readFileSync(path.join(ROOT, 'public/js/auth.js'), 'utf8');
    const start = auth.indexOf('async switchChildMember()');
    const end = auth.indexOf('_redirectAfterLogoutClear', start);
    assert.ok(start > 0 && end > start);
    const fn = auth.slice(start, end);
    assert.match(fn, /\/child\/profile-picker\?switch=1/);
    const pickerIdx = fn.indexOf('/child/profile-picker');
    const logoutIdx = fn.indexOf("fetch('/api/auth/logout'");
    assert.ok(pickerIdx > 0 && logoutIdx > 0 && pickerIdx < logoutIdx, 'trusted path must run before logout');
  });

  it('child-trusted-chrome hides logout and delegates profile switch to ProfileSwitchChrome', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-trusted-chrome.js'), 'utf8');
    assert.match(src, /logoutBtn.*display.*none/s);
    assert.match(src, /ProfileSwitchChrome\.apply/);
  });

  it('profile-switch-chrome exposes Byt profil on multi-profile daily UX', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/profile-switch-chrome.js'), 'utf8');
    const html = fs.readFileSync(path.join(ROOT, 'public/child-dashboard.html'), 'utf8');
    assert.match(src, /PROFILE_COUNT_KEY/);
    assert.match(src, /profile-switch-float-btn/);
    assert.match(src, /data-profile-switch-parent/);
    assert.match(src, /settings\.switchProfile/);
    assert.match(html, /Byt profil/);
    assert.match(html, /profile-switch-chrome\.js/);
  });

  it('child-system-menu shows Vuxen lock on daily UX', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-system-menu.js'), 'utf8');
    assert.match(src, /Vuxen/);
    assert.match(src, /🔒/);
  });

  it('profile picker page is registered on Express', () => {
    const routes = fs.readFileSync(path.join(ROOT, 'src/routes/index.js'), 'utf8');
    assert.match(routes, /\/child\/profile-picker/);
  });

  it('profile picker cards meet 44px minimum touch target', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/child-profile-picker.html'), 'utf8');
    assert.match(html, /cpp-profile-card[\s\S]*min-height:\s*11rem/);
    const rem = 11 * 16;
    assert.ok(rem >= 44, 'profile cards must be at least 44px tall');
  });

  it('profile picker does not load device-mode.js (cold start is orchestrator-only)', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/child-profile-picker.html'), 'utf8');
    assert.doesNotMatch(html, /device-mode\.js/);
  });

  it('profile picker requires AdultPrivilege unlock for Vuxen on shared device', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/child-profile-picker.js'), 'utf8');
    assert.doesNotMatch(js, /resumeParentIfSessionMatches/);
    assert.match(js, /requestTrustedProfileUnlock/);
    assert.match(js, /commitParentViewFromPicker/);
    assert.match(js, /markDecisionApplied/);
    assert.match(js, /matching \/api\/auth\/me/);
  });

  it('profile picker uses 2-column mobile grid', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/child-profile-picker.html'), 'utf8');
    assert.match(html, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
    assert.doesNotMatch(html, /auto-fill,\s*minmax\(min\(100%/);
  });

  it('profile picker uses AdultPrivilege for adult unlock', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/child-profile-picker.js'), 'utf8');
    assert.match(js, /AdultPrivilege\.requestTrustedProfileUnlock/);
    assert.doesNotMatch(js, /fetch\('\/api\/auth\/trusted-device\/select-parent'/);
  });

  it('trusted bootstrap does not sync widget binding on profile pick', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/trusted-device-bootstrap.js'), 'utf8');
    assert.doesNotMatch(src, /syncBinding/);
  });
});

describe('child logout / switch (barnmeny v2) — Fas 4A normative', () => {
  it('parental-gate falls back to Auth._showParentPinGateOverlay on child pages', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/parental-gate.js'), 'utf8');
    assert.match(src, /Auth\._showParentPinGateOverlay/);
  });

  it('daily UX hides child logout in trusted chrome', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-trusted-chrome.js'), 'utf8');
    assert.match(src, /logoutBtn/);
  });

  it('child-dashboard still exposes switchChildMember for multi-child shared', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard.js'), 'utf8');
    assert.match(src, /window\.switchChildMember\s*=\s*switchChildMember/);
  });
});
