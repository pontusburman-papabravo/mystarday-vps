'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('barnets_samling nav — #588', () => {
  it('child-worlds.js defines legacy + samling world sets behind gate', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds.js'), 'utf8');
    assert.match(src, /LEGACY_WORLDS/);
    assert.match(src, /SAMLING_WORLDS/);
    assert.match(src, /barnets_samling/);
    assert.match(src, /configureFromFeatures/);
    assert.match(src, /id: 'collection'/);
    assert.match(src, /id: 'treasure'/);
    assert.match(src, /Min samling/);
    assert.match(src, /Skattkammaren/);
    assert.match(src, /Mina personer/);
  });

  it('samling worlds expose four tabs with correct routes', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds.js'), 'utf8');
    assert.match(src, /\/child\/collection/);
    assert.match(src, /\/child\/treasure/);
    assert.match(src, /\/child\/today/);
    assert.match(src, /\/child\/family/);
  });

  it('child-worlds applies early samling chrome and boot guard', () => {
    const worlds = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds.js'), 'utf8');
    const bootCss = fs.readFileSync(path.join(ROOT, 'public/css/child-app-boot.css'), 'utf8');
    const html = fs.readFileSync(path.join(ROOT, 'public/child-dashboard.html'), 'utf8');
    assert.match(worlds, /finishAppBoot/);
    assert.match(worlds, /applySamlingChromeEarly/);
    assert.match(worlds, /child-app-boot/);
    assert.match(bootCss, /child-app-boot/);
    assert.match(bootCss, /data-nav-ready/);
    assert.match(html, /child-app-boot/);
  });

  it('child-worlds-nav waits for feature configuration', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds-nav.js'), 'utf8');
    assert.match(src, /child-worlds-configured/);
    assert.match(src, /getChildWorlds/);
    assert.match(src, /data-nav-ready/);
  });

  it('child-dashboard gates nav via configureFromFeatures', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard.js'), 'utf8');
    assert.match(src, /configureFromFeatures/);
    assert.match(src, /collectionView/);
    assert.match(src, /skipHub/);
  });

  it('rewards skip hub when barnets_samling active', () => {
    const dash = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard-rewards.js'), 'utf8');
    assert.match(dash, /options\.skipHub/);
  });

  it('child-samling-view uses ChildSamlingPresent without shop/collections', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-samling-view.js'), 'utf8');
    assert.match(src, /ChildSamlingView/);
    assert.match(src, /ChildSamlingPresent/);
    assert.doesNotMatch(src, /ChildCollections/);
    assert.doesNotMatch(src, /ChildAchievements/);
    assert.doesNotMatch(src, /Mer kommer snart/);
  });

  it('child-samling-present defines Min samling shell sections', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-samling-present.js'), 'utf8');
    assert.match(src, /ChildSamlingPresent/);
    assert.match(src, /bsp-hero-panel/);
    assert.match(src, /Stjärnmedaljer/);
    assert.match(src, /Trofévägg/);
    assert.match(src, /Dagar i rad/);
    assert.match(src, /Mina minneskort/);
    assert.match(src, /Min belöningshylla/);
    assert.match(src, /Diplom/);
    assert.match(src, /Min årsbok/);
    assert.doesNotMatch(src, /ChildCollections/);
    assert.doesNotMatch(src, /star_cost/);
  });

  it('child-samling-present B2 uses lifetime_stars not spendable saldo (#616)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-samling-present.js'), 'utf8');
    assert.match(src, /lifetime_stars/);
    assert.match(src, /Totalt har du tjänat/);
    assert.match(src, /De här stjärnorna visar allt du har klarat/);
    assert.match(src, /STAR_MEDALS/);
    assert.doesNotMatch(src, /starBalance/);
    assert.doesNotMatch(src, /\/api\/me\/rewards/);
  });

  it('child-samling-present B3 trofévägg from achievements (#617)', () => {
    const present = fs.readFileSync(path.join(ROOT, 'public/js/child-samling-present.js'), 'utf8');
    const view = fs.readFileSync(path.join(ROOT, 'public/js/child-samling-view.js'), 'utf8');
    assert.match(present, /universe\.achievements/);
    assert.match(present, /bsp-trophy-card/);
    assert.match(present, /bsp-wall-empty/);
    assert.match(present, /bindInteractions/);
    assert.doesNotMatch(present, /ChildAchievements/);
    assert.doesNotMatch(present, /ChildCollections/);
    assert.doesNotMatch(present, /skatt-section/);
    assert.match(view, /bindInteractions/);
  });

  it('child-samling-present B4 streak-kedja from stats.streak (#618)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-samling-present.js'), 'utf8');
    assert.match(src, /stats\.streak/);
    assert.match(src, /bsp-streak-chain/);
    assert.match(src, /Här växer din kedja när du är aktiv/);
    assert.match(src, /STREAK_GOLD_DAYS/);
    assert.doesNotMatch(src, /bruten/i);
    assert.doesNotMatch(src, /förlor/i);
    assert.doesNotMatch(src, /varning/i);
    assert.doesNotMatch(src, /text-red/);
  });

  it('child-dashboard.html includes Min samling present assets', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/child-dashboard.html'), 'utf8');
    assert.match(html, /id="collectionView"/);
    assert.match(html, /child-samling-memory\.js/);
    assert.match(html, /child-samling-yearbook\.js/);
    assert.match(html, /child-samling-present\.js/);
    assert.match(html, /child-samling-view\.js/);
    assert.match(html, /child-samling\.css/);
  });

  it('routes register collection and treasure child paths', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/index.js'), 'utf8');
    assert.match(src, /\/child\/collection/);
    assert.match(src, /\/child\/treasure/);
  });
});
