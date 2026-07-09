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

  it('Våra stunder uses curated timeline not full activity log', () => {
    const hall = read('public/js/child-family-hall.js');
    assert.match(hall, /cfh-story-timeline/);
    assert.match(hall, /cfh-story-chip/);
    assert.match(hall, /prestationslista/);
    assert.match(hall, /project_completed/);
  });

  it('Idag checkoff places checkbox on separate row', () => {
    const css = read('public/css/child-samling-shell.css');
    assert.match(css, /now-check[\s\S]*grid-row: 3/);
    assert.match(css, /card-check[\s\S]*grid-row: 2/);
    assert.match(css, /!important/);
  });

  it('Skattkammaren excludes active goal from reward list', () => {
    const src = read('public/js/child-treasure-present.js');
    assert.match(src, /activeGoalId/);
    assert.match(src, /listRewards/);
    assert.doesNotMatch(src, /btp-collect-hint/);
    assert.doesNotMatch(src, /starGridHtml/);
    assert.match(src, /btp-plaque/);
    assert.match(src, /btp-progress-star/);
    assert.match(src, /btp-scene/);
    assert.match(src, /btp-pending-card/);
    assert.match(src, /PROGRESS_STAR_MAX = 16/);
  });

  it('Skattkammaren progress stars cap at 16 with proportional fill', () => {
    const src = read('public/js/child-treasure-present.js');
    const ctx = {
      window: {
        ChildRewardsEngine: {
          computeStarGridProgress: function (filled, target) {
            const totalTarget = Math.max(1, parseInt(target, 10) || 1);
            const totalFilled = Math.max(0, parseInt(filled, 10) || 0);
            return { totalTarget: totalTarget, totalFilled: totalFilled, target: 24, filled: 7, truncated: true };
          },
        },
      },
      document: { createElement: function () { return { textContent: '' }; } },
    };
    vm.runInNewContext(src, ctx);
    const p = ctx.window.ChildTreasurePresent.computeProgressStars(99, 350);
    assert.equal(p.target, 16);
    assert.equal(p.totalTarget, 350);
    assert.equal(p.totalFilled, 99);
    assert.ok(p.filled > 0 && p.filled <= 16);
  });

  it('Skattkammaren skips legacy goal chrome when gate ON', () => {
    const rewards = read('public/js/child-dashboard-rewards.js');
    assert.match(rewards, /ChildTreasurePresent\.shouldUse/);
    assert.match(rewards, /clearGoalChrome/);
    const engine = read('public/js/child-rewards-engine.js');
    assert.match(engine, /isBarnetsSamlingPresentation/);
    const shell = read('public/css/child-samling-shell.css');
    assert.match(shell, /#childGoalProgressMount/);
  });

  it('Mina personer shows secondary sections without details fold', () => {
    const hall = read('public/js/child-family-hall.js');
    assert.match(hall, /renderSecondarySections/);
    assert.match(hall, /cfh-secondary-sections/);
    assert.doesNotMatch(hall, /cfh-below-fold/);
    assert.doesNotMatch(hall, /<details/);
  });

  it('Min samling trophy uses persistent is-selected state', () => {
    const src = read('public/js/child-samling-present.js');
    assert.match(src, /function bindTrophyCards[\s\S]*is-selected/);
    assert.doesNotMatch(src, /function bindTrophyCards[\s\S]*is-peek/);
    const css = read('public/css/child-samling.css');
    assert.match(css, /bsp-trophy-card\.is-selected/);
  });

  it('Min samling preview strip gives collection overview', () => {
    const src = read('public/js/child-samling-present.js');
    assert.match(src, /renderPreviewStrip/);
    assert.match(src, /bsp-preview-strip/);
  });

  it('bottom nav padding includes collection view', () => {
    const css = read('public/css/child-bottom-nav.css');
    assert.match(css, /#collectionView/);
  });
});
