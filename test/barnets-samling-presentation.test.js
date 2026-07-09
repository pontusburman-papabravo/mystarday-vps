'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('barnets samling — presentation polish', () => {
  it('shared shell CSS linked and scoped to gate ON', () => {
    const html = read('public/child-dashboard.html');
    assert.match(html, /child-samling-shell\.css/);
    const css = read('public/css/child-samling-shell.css');
    assert.match(css, /\[data-barnets-samling="on"\]/);
    assert.match(css, /safe-area-inset-bottom/);
    assert.match(css, /#collectionView/);
    assert.match(css, /#scheduleView/);
    assert.match(css, /#rewardsView/);
    assert.match(css, /#familyView/);
  });

  it('star grid caps visual cells at 24 with proportional fill', () => {
    const src = read('public/js/child-rewards-engine.js');
    assert.match(src, /STAR_GRID_MAX_CELLS = 24/);
    assert.match(src, /totalFilled/);
    assert.match(src, /totalTarget/);
    assert.match(src, /displayFilled = Math\.round/);

    const context = { window: {}, console };
    vm.runInNewContext(src, context);
    const engine = context.window.ChildRewardsEngine;
    const p = engine.computeStarGridProgress(97, 350);
    assert.equal(p.target, 24);
    assert.equal(p.totalTarget, 350);
    assert.equal(p.totalFilled, 97);
    assert.equal(p.truncated, true);
    assert.ok(p.filled > 0 && p.filled <= 24);
  });

  it('Min samling hero panel shows glass above fold', () => {
    const src = read('public/js/child-samling-present.js');
    assert.match(src, /renderHeroPanel/);
    assert.match(src, /bsp-hero-panel/);
    assert.match(src, /bsp-glass-jar--hero/);
    assert.doesNotMatch(src, /renderHeader/);
    const css = read('public/css/child-samling.css');
    assert.match(css, /bsp-hero-panel/);
    assert.match(css, /bsp-hero-glass-row/);
  });

  it('Mina personer uses single heading and warm banner below hero', () => {
    const hall = read('public/js/child-family-hall.js');
    assert.match(hall, /cfh-hero-panel/);
    assert.match(hall, /renderWarmBanner/);
    assert.match(hall, /De som hjälper mig/);
    assert.doesNotMatch(hall, /cfh-status/);
    const state = read('public/js/child-family-state.js');
    assert.doesNotMatch(state, /De som hjälper dig/);
  });

  it('bottom nav padding includes collection view', () => {
    const css = read('public/css/child-bottom-nav.css');
    assert.match(css, /#collectionView/);
  });
});
