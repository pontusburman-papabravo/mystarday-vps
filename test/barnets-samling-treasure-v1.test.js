'use strict';

/**
 * #585 — Fas C Skattkammaren v1 regression (gate ON presentation).
 * Verifierar aktivt mål, progress, fem statusar, historik och NPF-copy.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const REWARDS_PATH = path.join(ROOT, 'public/js/child-dashboard-rewards.js');
const PRESENT_PATH = path.join(ROOT, 'public/js/child-treasure-present.js');
const TODAY_PATH = path.join(ROOT, 'public/js/child-today-focus.js');
const SAMLING_PRESENT_PATH = path.join(ROOT, 'public/js/child-samling-present.js');

const GOAL_ID = 'goal-1';
const OTHER_ID = 'other-2';

const FORBIDDEN = [
  /\bshop\b/i,
  /\bköp\b/i,
  /\bloot\b/i,
  /\bclaim\b/i,
  /\bcasino\b/i,
  /misslyck/i,
  /förlor/i,
  /du har inga/i,
  /skynda/i,
  /lifetime_stars/,
];

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function loadTreasureRuntime() {
  const viewEl = {
    style: {},
    innerHTML: '',
    classList: { add: function () {}, remove: function () {} },
  };
  const loaderEl = { style: { display: '' } };
  const context = {
    window: {
      ChildWorlds: {
        isBarnetsSamlingEnabled: function () { return true; },
      },
      matchMedia: function () { return { matches: false }; },
      escHtml: function (s) { return String(s == null ? '' : s); },
    },
    document: {
      getElementById: function (id) {
        if (id === 'skattkammarView') return viewEl;
        if (id === 'skattkammarLoading') return loaderEl;
        return null;
      },
      createElement: function () {
        return { textContent: '', innerHTML: '' };
      },
    },
    navigator: { onLine: true },
    console: console,
    minimalUiActive: false,
    childUiMagic: false,
    me: { id: 'child-1', name: 'Anna' },
    escHtml: function (s) { return String(s == null ? '' : s); },
    Auth: { api: async function () { return {}; } },
    rewardsLoaded: false,
  };
  context.window.escHtml = context.escHtml;
  vm.runInNewContext(read(REWARDS_PATH), context);
  vm.runInNewContext(read(PRESENT_PATH), context);
  for (const key of ['resolveSkattState', 'skattRewardState', 'sortRewardsForList', 'SKATT_STATES']) {
    context[key] = context.window[key];
  }
  return {
    viewEl: viewEl,
    render: context.window.ChildTreasurePresent.render,
    rewardPresentStatus: context.window.ChildTreasurePresent.rewardPresentStatus,
    SKATT_STATES: context.window.SKATT_STATES,
  };
}

function fixture(overrides) {
  return Object.assign({
    rewardsData: {
      starBalance: 15,
      rewards: [
        { id: GOAL_ID, name: 'Biokväll', star_cost: 50, icon: '🎬' },
        { id: OTHER_ID, name: 'Glass', star_cost: 20, icon: '🍦' },
      ],
      redemptions: [],
    },
    goalData: {
      goal: { reward_id: GOAL_ID, reward_name: 'Biokväll', star_cost: 50, reward_icon: '🎬' },
      progress_pct: 30,
      pending_change_request: null,
    },
    manualData: { grants: [] },
  }, overrides || {});
}

describe('#585 Fas C — Skattkammaren v1 render (gate ON)', () => {
  it('shows spendable saldo header and active goal progress', () => {
    const { render, viewEl } = loadTreasureRuntime();
    const data = fixture();
    assert.equal(render(data.rewardsData, data.goalData, data.manualData), true);
    assert.match(viewEl.innerHTML, /stjärnor att använda/);
    assert.match(viewEl.innerHTML, />15</);
    assert.match(viewEl.innerHTML, /Du sparar till/);
    assert.match(viewEl.innerHTML, /Biokväll/);
    assert.match(viewEl.innerHTML, /15 av 50 stjärnor/);
    assert.match(viewEl.innerHTML, /Bara 35 kvar/);
    assert.doesNotMatch(viewEl.innerHTML, /lifetime_stars/);
  });

  it('shows redeem-ready copy when goal is affordable', () => {
    const { render, viewEl } = loadTreasureRuntime();
    const data = fixture({
      rewardsData: {
        starBalance: 55,
        rewards: [{ id: GOAL_ID, name: 'Biokväll', star_cost: 50, icon: '🎬' }],
        redemptions: [],
      },
      goalData: {
        goal: { reward_id: GOAL_ID, reward_name: 'Biokväll', star_cost: 50 },
        progress_pct: 100,
      },
    });
    render(data.rewardsData, data.goalData, data.manualData);
    assert.match(viewEl.innerHTML, /Du kan lösa in den här nu/);
    assert.match(viewEl.innerHTML, /Fråga om att lösa in/);
    assert.match(viewEl.innerHTML, /Kan lösas in/);
  });

  it('shows pending as Väntar på vuxen without redeem CTA on that reward', () => {
    const { render, viewEl } = loadTreasureRuntime();
    const data = fixture({
      rewardsData: {
        starBalance: 60,
        rewards: [{ id: GOAL_ID, name: 'Biokväll', star_cost: 50, icon: '🎬' }],
        redemptions: [{
          reward_id: GOAL_ID,
          reward_name: 'Biokväll',
          reward_icon: '🎬',
          status: 'pending',
          created_at: '2026-07-01T11:00:00.000Z',
        }],
      },
    });
    render(data.rewardsData, data.goalData, data.manualData);
    assert.match(viewEl.innerHTML, /Väntar på vuxen/);
    assert.doesNotMatch(viewEl.innerHTML, /Fråga om att lösa in/);
  });

  it('shows Godkänd banner on recent approval and Genomförd in history', () => {
    const { render, viewEl } = loadTreasureRuntime();
    const recentApproval = new Date(Date.now() - 500).toISOString();
    const data = fixture({
      rewardsData: {
        starBalance: 5,
        rewards: [{ id: GOAL_ID, name: 'Biokväll', star_cost: 50, icon: '🎬' }],
        redemptions: [{
          reward_id: GOAL_ID,
          reward_name: 'Biokväll',
          reward_icon: '🎬',
          star_cost: 50,
          status: 'approved',
          created_at: recentApproval,
        }],
      },
      goalData: {
        goal: { reward_id: GOAL_ID, reward_name: 'Biokväll', star_cost: 50 },
        progress_pct: 10,
      },
    });
    render(data.rewardsData, data.goalData, data.manualData);
    assert.match(viewEl.innerHTML, /<strong>Godkänd<\/strong>/);
    assert.match(viewEl.innerHTML, /Belöningar jag sparat ihop till/);
    assert.match(viewEl.innerHTML, /Genomförd/);
  });

  it('shows warm empty history when no approved redemptions', () => {
    const { render, viewEl } = loadTreasureRuntime();
    const data = fixture();
    render(data.rewardsData, data.goalData, data.manualData);
    assert.match(viewEl.innerHTML, /Här kommer belöningar du sparat ihop till att synas/);
    assert.doesNotMatch(viewEl.innerHTML, /ingen historik/i);
  });

  it('shows warm empty goal when no goal selected', () => {
    const { render, viewEl } = loadTreasureRuntime();
    const data = fixture({ goalData: { goal: null, progress_pct: 0 } });
    render(data.rewardsData, data.goalData, data.manualData);
    assert.match(viewEl.innerHTML, /Här kan du välja vad du vill spara till/);
    assert.match(viewEl.innerHTML, /openGoalPicker/);
  });

  it('maps five presentation statuses from reward state', () => {
    const { rewardPresentStatus } = loadTreasureRuntime();
    assert.equal(rewardPresentStatus({ isRedeemed: false, hasPending: false, ready: false }).label, 'Sparar');
    assert.equal(rewardPresentStatus({ ready: true }).label, 'Kan lösas in');
    assert.equal(rewardPresentStatus({ hasPending: true }).label, 'Väntar på vuxen');
    assert.equal(rewardPresentStatus({ isRedeemed: true }).label, 'Genomförd');
  });

  it('avoids forbidden shop/shame copy in presentation source', () => {
    const src = read(PRESENT_PATH);
    FORBIDDEN.forEach(function (pattern) {
      assert.doesNotMatch(src, pattern, 'forbidden: ' + pattern);
    });
    assert.match(src, /stjärnor att använda/);
    assert.match(src, /Belöningar jag sparat ihop till/);
  });
});

describe('#585 Fas C — isolation from Idag and Min samling', () => {
  it('Idag has no Skattkammaren gate coupling', () => {
    const src = read(TODAY_PATH);
    assert.doesNotMatch(src, /ChildTreasurePresent/);
    assert.doesNotMatch(src, /btp-/);
  });

  it('Min samling does not use spendable saldo or redeem', () => {
    const src = read(SAMLING_PRESENT_PATH);
    assert.doesNotMatch(src, /starBalance/);
    assert.doesNotMatch(src, /requestRedeem/);
    assert.doesNotMatch(src, /\/api\/me\/rewards/);
  });

  it('renderSkattkammaren still delegates to ChildTreasurePresent only when gate on', () => {
    const src = read(REWARDS_PATH);
    const fn = src.slice(src.indexOf('function renderSkattkammaren'), src.indexOf('// ── Coin sound'));
    assert.match(fn, /ChildTreasurePresent\.shouldUse/);
    assert.match(fn, /ChildTreasurePresent\.render/);
    assert.doesNotMatch(fn, /lifetime_stars/);
  });
});
