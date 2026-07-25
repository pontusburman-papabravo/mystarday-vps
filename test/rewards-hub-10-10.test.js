'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HUB = path.join(ROOT, 'public/js/rewards-hub.js');
const PENDING = path.join(ROOT, 'public/js/pending-approvals.js');

describe('Belöningar hub 10/10', () => {
  it('uses priority ladder: pending mount before hub sections', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/rewards.html'), 'utf8');
    const pendingIdx = html.indexOf('rewardsPendingMount');
    const hubIdx = html.indexOf('rewardsHubMount');
    assert.ok(pendingIdx >= 0 && hubIdx > pendingIdx);
    const hub = fs.readFileSync(HUB, 'utf8');
    assert.match(hub, /renderPending/);
    assert.match(hub, /PendingApprovals\.mountHub\(pendingMount, \{ hub: true \}\)/);
  });

  it('links manage to library#rewards not skattkammaren', () => {
    const src = fs.readFileSync(HUB, 'utf8');
    assert.match(src, /href: '\/library#rewards'/);
    assert.match(src, /library\.rewardsHub\.manageLink\.title/);
    assert.doesNotMatch(src, /\/skattkammaren/);
  });

  it('shows inline star overview per child via dashboard-stats', () => {
    const src = fs.readFileSync(HUB, 'utf8');
    assert.match(src, /\/api\/family\/dashboard-stats/);
    assert.match(src, /proximityCopy/);
    assert.match(src, /nearest_reward/);
    assert.match(src, /library\.rewardsHub\.sections\.starsChest/);
    assert.match(src, /library\.rewardsHub\.starsSub/);
    assert.match(src, /ingen syskonjämförelse/);
  });

  it('child rows link to barnprofil rewards tab', () => {
    const src = fs.readFileSync(HUB, 'utf8');
    assert.match(src, /\/family\/child\/.*\?tab=rewards/);
  });

  it('hides empty pending section (no inga väntande box on hub)', () => {
    const pending = fs.readFileSync(PENDING, 'utf8');
    assert.match(pending, /mountEl\.innerHTML = ''/);
    assert.match(pending, /mountEl\.classList\.add\('hidden'\)/);
    assert.match(pending, /hub: opts\.hub/);
    assert.match(pending, /vill ha "/);
  });

  it('rewards magic page hides large hero like planning', () => {
    const hubs = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-page-hubs.js'), 'utf8');
    assert.match(hubs, /page === 'rewards'/);
    assert.match(hubs, /el\.classList\.add\('hidden'\)/);
  });

  it('keeps reports in Övrigt via capabilitiesForPlacement', () => {
    const src = fs.readFileSync(HUB, 'utf8');
    assert.match(src, /capabilitiesForPlacement/);
    assert.match(src, /rewards_hub/);
    assert.match(src, /library\.rewardsHub\.sections\.other/);
  });

  it('SW bumped for Belöningar 10/10', () => {
    const sw = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
    const cache = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/cache-version.json'), 'utf8'));
    assert.match(sw, new RegExp("const CACHE_NAME = '" + cache.cacheName + "'"));
    assert.ok(cache.cacheName >= 'stjarndag-v436');
  });
});
