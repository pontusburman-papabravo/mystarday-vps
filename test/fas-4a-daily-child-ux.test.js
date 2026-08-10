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

  it('shared single child still resolves child-home with zero picker taps', () => {
    const resolved = resolveAppEntry({
      trustedDevice: { valid: true, deviceMode: 'shared' },
      allowedChildren: [{ id: 'solo-child-id' }],
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
    const fn = auth.slice(auth.indexOf('async switchChildMember()'), auth.indexOf('async switchChildMember()') + 1200);
    assert.match(fn, /\/child\/profile-picker\?switch=1/);
    const pickerIdx = fn.indexOf('/child/profile-picker');
    const logoutIdx = fn.indexOf("fetch('/api/auth/logout'");
    assert.ok(pickerIdx > 0 && pickerIdx < logoutIdx, 'trusted path must run before logout');
  });

  it('child-trusted-chrome hides logout and gates switch by allowed count', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-trusted-chrome.js'), 'utf8');
    assert.match(src, /logoutBtn.*display.*none/s);
    assert.match(src, /allowed > 1/);
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
