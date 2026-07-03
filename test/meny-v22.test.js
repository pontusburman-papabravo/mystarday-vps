'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('meny v2.2 — Sprint 1 redirects + links', () => {
  it('child-settings without id redirects to /family', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/index.js'), 'utf8');
    assert.match(src, /child-settings[\s\S]*redirect\(302, '\/family'\)/);
  });

  it('child-profile setup is inline via ChildProfileSetup', () => {
    const profile = fs.readFileSync(path.join(ROOT, 'public/js/child-profile.js'), 'utf8');
    const setup = fs.readFileSync(path.join(ROOT, 'public/js/child-profile-setup.js'), 'utf8');
    assert.match(profile, /ChildProfileSetup/);
    assert.match(setup, /profileSetupPhotoBtn/);
    assert.match(setup, /profileSetupMood/);
  });
});

describe('meny v2.2 — Sprint 2 readiness extensions + PX4', () => {
  it('readiness API includes backfill and invite types', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/family/core.js'), 'utf8');
    assert.match(src, /incomplete_past_days/);
    assert.match(src, /pending_invite/);
  });

  it('home-readiness exposes warnings-only filter', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/home-readiness.js'), 'utf8');
    assert.match(src, /warningsOnlyEnabled/);
    assert.match(src, /homeReadinessFilter/);
    assert.match(src, /HomeReadiness/);
  });
});

describe('meny v2.2 — Sprint 3 Hem PX3 + profile links', () => {
  it('dashboard sorts children by attention score', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/dashboard.js'), 'utf8');
    assert.match(src, /childAttentionScore/);
    assert.match(src, /childList\.slice\(\)\.sort/);
  });

  it('dashboard child name links to barnprofil', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/dashboard.js'), 'utf8');
    assert.match(src, /\/family\/child\/\$\{c\.id\}/);
  });
});

describe('meny v2.2 — Sprint 4 barnprofil progress (B5)', () => {
  it('child-profile progress tab loads star-history', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-profile.js'), 'utf8');
    assert.match(src, /progressTabHtml/);
    assert.match(src, /\/api\/family\/star-history/);
    assert.match(src, /profileProgressBody/);
  });
});

describe('meny v2.2 — Sprint 5 barn KX3/KX6/KX8', () => {
  it('SSE schedule update shows toast', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard-sse.js'), 'utf8');
    assert.match(src, /Schema uppdaterat/);
  });

  it('child-rewards-engine mounts pending banner', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-rewards-engine.js'), 'utf8');
    assert.match(src, /mountPendingBannerIfNeeded/);
    assert.match(src, /setRewardsData/);
    assert.match(src, /isWorldSceneActive/);
    assert.match(src, /clearGoalChrome/);
  });

  it('child-world refreshes rewards engine on enter', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-world.js'), 'utf8');
    assert.match(src, /refreshRewards/);
    assert.match(src, /isWorldSceneActive/);
    assert.match(src, /clearGoalChrome/);
  });
});

describe('meny v2.2 — Sprint 6 barn KX7/KX11', () => {
  it('child-dashboard shows denied redemptions kindly', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard-rewards.js'), 'utf8');
    assert.match(src, /deniedRecent/);
    assert.match(src, /Inte den här gången/);
  });

  it('family hall API includes persons for child', () => {
    const src = fs.readFileSync(path.join(ROOT, 'db/family-hall.js'), 'utf8');
    assert.match(src, /includePersons/);
    assert.match(src, /persons/);
  });

  it('child-family-hall renders Mina personer from state', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-family-hall.js'), 'utf8');
    assert.match(src, /Mina personer/);
    assert.match(src, /resolveFamilyState/);
    assert.match(src, /cfh-persons-primary/);
  });
});

describe('meny v2.2 — Sprint 7 cleanup', () => {
  it('child-dashboard.html no longer loads child-package-nav', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/child-dashboard.html'), 'utf8');
    assert.doesNotMatch(html, /child-package-nav\.js/);
  });

  it('service worker bumped for v2.2+', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
    assert.match(src, /stjarndag-v(?:29[3-9]|[3-9]\d\d|\d{4,})/);
  });
});
