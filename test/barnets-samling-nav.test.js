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

  it('child-worlds-nav waits for feature configuration', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds-nav.js'), 'utf8');
    assert.match(src, /child-worlds-configured/);
    assert.match(src, /getChildWorlds/);
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
    assert.match(src, /Stjärnglaset/);
    assert.match(src, /Trofévägg/);
    assert.match(src, /Dagar i rad/);
    assert.doesNotMatch(src, /ChildCollections/);
    assert.doesNotMatch(src, /star_cost/);
  });

  it('child-dashboard.html includes Min samling present assets', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/child-dashboard.html'), 'utf8');
    assert.match(html, /id="collectionView"/);
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
