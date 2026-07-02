'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('meny v2.1 — Sprint 1 deploy prep + mobile-nav', () => {
  it('mobile-nav prefers NavConfig over sidebar scrape', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/mobile-nav.js'), 'utf8');
    assert.match(src, /buildConfigLinks/);
    assert.match(src, /NavConfig\.PRIMARY_NAV/);
    assert.match(src, /pathMatches/);
  });

  it('parent avatar menu hides subscription on native', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/parent-avatar-menu.js'), 'utf8');
    assert.match(src, /isNativeShell/);
    assert.match(src, /subscription.*isNativeShell/s);
  });

  it('settings subscription shows native message instead of billing UI', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/settings-subscription.js'), 'utf8');
    assert.match(src, /isNative/);
    assert.match(src, /webbläsaren/);
  });
});

describe('meny v2.1 — Sprint 2 pending approvals', () => {
  it('pending-approvals.js exports hub mount + API helpers', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/pending-approvals.js'), 'utf8');
    assert.match(src, /mountHub/);
    assert.match(src, /pending-requests/);
    assert.match(src, /goal-change-requests/);
  });

  it('rewards hub mounts pending section', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/rewards-hub.js'), 'utf8');
    assert.match(src, /rewardsPendingMount/);
    assert.match(src, /PendingApprovals\.mountHub/);
    assert.match(src, /pending-approvals-changed/);
  });

  it('rewards.html loads pending-approvals before hub', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/rewards.html'), 'utf8');
    const pendingIdx = html.indexOf('pending-approvals.js');
    const hubIdx = html.indexOf('rewards-hub.js');
    assert.ok(pendingIdx >= 0 && hubIdx > pendingIdx);
    assert.match(html, /rewardsPendingMount/);
  });
});

describe('meny v2.1 — Sprint 3 barnprofil', () => {
  it('child-profile uses PUT pin endpoint and rewards tab async', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-profile.js'), 'utf8');
    assert.match(src, /\/pin'/);
    assert.match(src, /method: 'PUT'/);
    assert.match(src, /rewardsTabHtml/);
    assert.match(src, /child_profile_section/);
    assert.match(src, /incompleteDaysCount/);
  });

  it('family-child.html loads pending-approvals for profile rewards tab', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/family-child.html'), 'utf8');
    assert.match(html, /pending-approvals\.js/);
    assert.match(html, /child-profile\.js/);
  });
});

describe('meny v2.1 — Sprint 4 engine split', () => {
  it('child-activity-engine exposes paused banner + setLastDayData', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-activity-engine.js'), 'utf8');
    assert.match(src, /setLastDayData/);
    assert.match(src, /mountPausedBannerIfNeeded/);
    assert.match(src, /Ledig idag/);
  });

  it('child-rewards-engine exposes goal progress mount', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-rewards-engine.js'), 'utf8');
    assert.match(src, /setGoalData/);
    assert.match(src, /mountGoalProgress/);
    assert.match(src, /flashStarEconomy/);
  });

  it('child-dashboard wires engines after loadDay and loadRewards', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard-load-day.js'), 'utf8');
    assert.match(src, /ChildActivityEngine\.setLastDayData/);
    assert.match(src, /ChildRewardsEngine\.setGoalData/);
    assert.match(src, /coalescedLoadDay/);
  });

  it('child-today shell mounts paused banner on enter', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-today.js'), 'utf8');
    assert.match(src, /ChildActivityEngine/);
    assert.match(src, /mountPausedBannerIfNeeded/);
  });
});

describe('meny v2.1 — Sprint 5 polish + star flash', () => {
  it('child-dashboard-sse flashes star economy on STAR_GRANTED', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard-sse.js'), 'utf8');
    assert.match(src, /ChildRewardsEngine\.flashStarEconomy/);
  });

  it('child-dashboard has star flash CSS', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/child-dashboard.html'), 'utf8');
    assert.match(html, /child-star-flash/);
    assert.match(html, /childStarFlash/);
  });
});

describe('meny v2.1 — Sprint 6 readiness API + Hem', () => {
  it('GET /api/family/readiness registered with correct goal table', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/family/core.js'), 'utf8');
    assert.match(src, /router\.get\('\/readiness'/);
    assert.match(src, /child_reward_goal_change_request/);
    assert.doesNotMatch(src, /FROM goal_change_request/);
  });

  it('home-readiness fetches API and tracks clicks', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/home-readiness.js'), 'utf8');
    assert.match(src, /\/api\/family\/readiness/);
    assert.match(src, /readiness_action_click/);
    assert.match(src, /data-child-id/);
  });

  it('dashboard.html loads home-readiness', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/dashboard.html'), 'utf8');
    assert.match(html, /home-readiness\.js/);
    assert.match(html, /homeReadinessMount/);
  });
});

describe('meny v2.1 — Sprint 7 coach + support layer', () => {
  it('child-today-coach shows next activity hint', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-today-coach.js'), 'utf8');
    assert.match(src, /peekNextActivity/);
    assert.match(src, /now-card/);
    assert.match(src, /next-card/);
  });

  it('child-support-layer has interactive substeps renderer', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-support-layer.js'), 'utf8');
    assert.match(src, /renderInteractiveSubsteps/);
  });

  it('child-dashboard delegates substeps to support layer', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard-substeps.js'), 'utf8');
    assert.match(src, /ChildSupportLayer\.renderInteractiveSubsteps/);
  });
});

describe('meny v2.1 — Sprint 8 analytics, deep-links, cleanup', () => {
  it('deep-link-router maps family child profile paths', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/deep-link-router.js'), 'utf8');
    assert.match(src, /\/family\/child\//);
    assert.match(src, /\/rewards/);
  });

  it('child-package-nav removed after barnmeny v2', () => {
    assert.ok(!fs.existsSync(path.join(ROOT, 'public/js/child-package-nav.js')));
  });

  it('service worker bumped for v2.1+', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
    assert.match(src, /stjarndag-v(?:29[3-9]|[3-9]\d\d|\d{4,})/);
  });
});
