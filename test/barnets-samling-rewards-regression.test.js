'use strict';

/**
 * #592 — Regression: belöningsflöde efter #588–#591.
 * Verifierar att saldo, inlösen, pending/godkänd/historik och gate ON/OFF
 * fortfarande använder samma reward/redeem-logik — inga nya produktbeteenden.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const REWARDS_PATH = path.join(ROOT, 'public/js/child-dashboard-rewards.js');
const PRESENT_PATH = path.join(ROOT, 'public/js/child-treasure-present.js');
const WORLDS_PATH = path.join(ROOT, 'public/js/child-worlds.js');

const GOAL_ID = 'goal-1';
const OTHER_ID = 'other-2';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function loadRewardsRuntime(presentOpts) {
  presentOpts = presentOpts || {};
  const viewEl = {
    style: {},
    innerHTML: '',
    classList: { add: function () {}, remove: function () {} },
    querySelectorAll: function () { return []; },
  };
  const loaderEl = { style: {}, innerHTML: '' };
  const context = {
    window: {
      ChildTreasurePresent: null,
      ChildWorlds: {
        isBarnetsSamlingEnabled: function () { return !!presentOpts.gateOn; },
        shouldSkipHubForRewards: function () { return !!presentOpts.gateOn; },
        prepareTreasureEntry: function () {},
        isWorldHubEntryDisabled: function () { return !!presentOpts.gateOn; },
      },
      matchMedia: function () { return { matches: false }; },
      rewardsLoaded: false,
    },
    document: {
      getElementById: function (id) {
        if (id === 'skattkammarView') return viewEl;
        if (id === 'skattkammarLoading') return loaderEl;
        return null;
      },
      createElement: function () { return { textContent: '', innerHTML: '' }; },
      body: { classList: { add: function () {}, remove: function () {} }, appendChild: function () {} },
      querySelector: function () { return null; },
    },
    navigator: { onLine: true },
    console: console,
    minimalUiActive: false,
    childUiMagic: false,
    me: { id: 'child-1', name: 'Anna' },
    escHtml: function (s) { return String(s); },
    Auth: { api: async function () { return {}; } },
    rewardsLoaded: false,
    showToast: function () {},
    loadRewards: async function () {},
  };
  context.window.escHtml = context.escHtml;
  context.window.me = context.me;
  vm.runInNewContext(read(REWARDS_PATH), context);
  if (presentOpts.loadPresent !== false) {
    vm.runInNewContext(read(PRESENT_PATH), context);
    context.ChildTreasurePresent = context.window.ChildTreasurePresent;
    context.ChildWorlds = context.window.ChildWorlds;
  }
  for (const key of ['resolveSkattState', 'skattRewardState', 'sortRewardsForList', 'SKATT_STATES']) {
    context[key] = context.window[key];
  }
  return {
    context: context,
    viewEl: viewEl,
    renderSkattkammaren: context.window.renderSkattkammaren,
    resolveSkattState: context.window.resolveSkattState,
    skattRewardState: context.window.skattRewardState,
    SKATT_STATES: context.window.SKATT_STATES,
    requestRedeem: context.window.requestRedeem,
  };
}

function fixture(overrides) {
  return Object.assign({
    rewardsData: {
      starBalance: 15,
      rewards: [
        { id: GOAL_ID, name: 'Filmkväll', star_cost: 10, icon: '🎬' },
        { id: OTHER_ID, name: 'Glass', star_cost: 20, icon: '🍦' },
      ],
      redemptions: [],
    },
    goalData: {
      goal: { reward_id: GOAL_ID, reward_name: 'Filmkväll', star_cost: 10, reward_icon: '🎬' },
      progress_pct: 100,
      pending_change_request: null,
    },
    manualData: { grants: [] },
  }, overrides || {});
}

describe('#592 reward flow regression — redeem contracts unchanged', () => {
  it('requestRedeem still POSTs /api/me/rewards/:id/redeem', () => {
    const src = read(REWARDS_PATH);
    const fn = src.slice(src.indexOf('async function requestRedeem'), src.indexOf('async function redeemReward'));
    assert.match(fn, /Auth\.api\('\/api\/me\/rewards\/' \+ rewardId \+ '\/redeem'/);
    assert.match(fn, /method: 'POST'/);
    assert.doesNotMatch(fn, /\/api\/me\/goal/);
  });

  it('loadRewards still fetches rewards, goal and manual-stars APIs', () => {
    const src = read(REWARDS_PATH);
    assert.match(src, /Auth\.api\('\/api\/me\/rewards'\)/);
    assert.match(src, /Auth\.api\('\/api\/me\/goal'\)/);
    assert.match(src, /Auth\.api\('\/api\/me\/manual-stars'\)/);
    const inner = src.slice(src.indexOf('async function loadRewardsInner'), src.indexOf('function renderSkattkammaren'));
    assert.doesNotMatch(inner, /\/redeem/);
  });

  it('route helpers do not call redeem or reward POST endpoints', () => {
    const worlds = read(WORLDS_PATH);
    for (const name of ['prepareTreasureEntry', 'exitFromTreasureRoute', 'shouldSkipHubForRewards', 'syncChildRoute']) {
      const start = worlds.indexOf('function ' + name);
      assert.ok(start >= 0, name + ' should exist');
      const next = worlds.indexOf('\nfunction ', start + 1);
      const fn = worlds.slice(start, next > start ? next : start + 1200);
      assert.doesNotMatch(fn, /requestRedeem/);
      assert.doesNotMatch(fn, /\/redeem/);
      assert.doesNotMatch(fn, /Auth\.api/);
    }
  });

  it('gate ON presentation wires redeem through global requestRedeem only', () => {
    const present = read(PRESENT_PATH);
    assert.match(present, /requestRedeem/);
    assert.match(present, /openGoalPicker\(\)/);
    assert.doesNotMatch(present, /Auth\.api/);
    assert.doesNotMatch(present, /\/redeem/);
  });

  it('gate OFF legacy render still wires redeem through requestRedeem', () => {
    const rewards = read(REWARDS_PATH);
    const legacyStart = rewards.indexOf('const { rewards, starBalance, redemptions } = rewardsData');
    assert.ok(legacyStart >= 0);
    const legacy = rewards.slice(legacyStart, rewards.indexOf('view.innerHTML = html', legacyStart));
    assert.match(legacy, /requestRedeem/);
    assert.match(legacy, /openGoalPicker\(\)/);
  });
});

describe('#592 reward flow regression — shared state machine (gate ON + OFF)', () => {
  it('gate ON and OFF both use resolveSkattState for redeem primary CTA', () => {
    const { resolveSkattState } = loadRewardsRuntime({ gateOn: true });
    const data = fixture({
      rewardsData: { starBalance: 25, rewards: [{ id: GOAL_ID, name: 'Film', star_cost: 20, icon: '🎬' }], redemptions: [] },
      goalData: { goal: { reward_id: GOAL_ID, reward_name: 'Film', star_cost: 20 }, progress_pct: 100 },
    });
    const skatt = resolveSkattState(data.rewardsData, data.goalData);
    assert.equal(skatt.primaryAction.type, 'redeem');
    assert.equal(skatt.primaryAction.rewardId, GOAL_ID);
  });

  it('pending redemption blocks primary redeem in both presentation paths', () => {
    const { resolveSkattState, SKATT_STATES } = loadRewardsRuntime({ gateOn: true });
    const data = fixture({
      rewardsData: {
        starBalance: 30,
        rewards: [{ id: GOAL_ID, name: 'Film', star_cost: 10, icon: '🎬' }],
        redemptions: [{ reward_id: GOAL_ID, reward_name: 'Film', status: 'pending', created_at: '2026-07-01T10:00:00.000Z' }],
      },
    });
    const skatt = resolveSkattState(data.rewardsData, data.goalData);
    assert.equal(skatt.state, SKATT_STATES.AWAITING_DECISION);
    assert.equal(skatt.primaryAction, null);
    assert.equal(skatt.pending.length, 1);
  });

  it('approved redemptions surface as redeemed in skattRewardState', () => {
    const { skattRewardState } = loadRewardsRuntime({ gateOn: true });
    const reward = { id: GOAL_ID, name: 'Film', star_cost: 10 };
    const redemptions = [{ reward_id: GOAL_ID, status: 'approved', created_at: '2026-06-01T10:00:00.000Z' }];
    const st = skattRewardState(reward, 5, redemptions, { reward_id: OTHER_ID });
    assert.equal(st.isRedeemed, true);
    assert.equal(st.ready, false);
  });
});

describe('#592 reward flow regression — render saldo, pending, redeem, history', () => {
  it('gate ON render shows star balance and redeem CTA', () => {
    const { renderSkattkammaren, viewEl } = loadRewardsRuntime({ gateOn: true });
    const data = fixture({
      rewardsData: { starBalance: 18, rewards: [{ id: GOAL_ID, name: 'Filmkväll', star_cost: 10, icon: '🎬' }], redemptions: [] },
    });
    renderSkattkammaren(data.rewardsData, data.goalData, data.manualData);
    assert.match(viewEl.innerHTML, /btp-balance-count/);
    assert.match(viewEl.innerHTML, />18</);
    assert.match(viewEl.innerHTML, /stjärnor att använda/);
    assert.match(viewEl.innerHTML, /requestRedeem\('goal-1'\)/);
    assert.match(viewEl.innerHTML, /Fråga om att lösa in/);
  });

  it('gate ON render shows väntar på godkännande for pending redemption', () => {
    const { renderSkattkammaren, viewEl } = loadRewardsRuntime({ gateOn: true });
    const data = fixture({
      rewardsData: {
        starBalance: 12,
        rewards: [{ id: GOAL_ID, name: 'Filmkväll', star_cost: 10, icon: '🎬' }],
        redemptions: [{ reward_id: GOAL_ID, reward_name: 'Filmkväll', reward_icon: '🎬', status: 'pending', created_at: '2026-07-01T09:00:00.000Z' }],
      },
    });
    renderSkattkammaren(data.rewardsData, data.goalData, data.manualData);
    assert.match(viewEl.innerHTML, /Väntar på godkännande/);
    assert.match(viewEl.innerHTML, /väntar på en vuxen\./);
    assert.doesNotMatch(viewEl.innerHTML, /Fråga om att lösa in/);
  });

  it('gate ON render shows history for approved redemptions', () => {
    const { renderSkattkammaren, viewEl } = loadRewardsRuntime({ gateOn: true });
    const data = fixture({
      rewardsData: {
        starBalance: 3,
        rewards: [{ id: GOAL_ID, name: 'Filmkväll', star_cost: 10, icon: '🎬' }],
        redemptions: [{
          reward_id: GOAL_ID,
          reward_name: 'Filmkväll',
          reward_icon: '🎬',
          status: 'approved',
          created_at: '2026-06-15T12:00:00.000Z',
        }],
      },
    });
    renderSkattkammaren(data.rewardsData, data.goalData, data.manualData);
    assert.match(viewEl.innerHTML, /Belöningar jag sparat ihop till/);
    assert.match(viewEl.innerHTML, /Filmkväll/);
    assert.match(viewEl.innerHTML, /Genomförd/);
  });

  it('gate OFF legacy render shows balance, pending and redeem handlers', () => {
    const { renderSkattkammaren, viewEl } = loadRewardsRuntime({ gateOn: false });
    const data = fixture({
      rewardsData: {
        starBalance: 22,
        rewards: [
          { id: GOAL_ID, name: 'Filmkväll', star_cost: 10, icon: '🎬' },
          { id: OTHER_ID, name: 'Glass', star_cost: 20, icon: '🍦' },
        ],
        redemptions: [{
          reward_id: OTHER_ID,
          reward_name: 'Glass',
          status: 'pending',
          created_at: '2026-07-01T08:00:00.000Z',
        }],
      },
      goalData: {
        goal: { reward_id: GOAL_ID, reward_name: 'Filmkväll', star_cost: 10 },
        progress_pct: 100,
      },
    });
    renderSkattkammaren(data.rewardsData, data.goalData, data.manualData);
    assert.match(viewEl.innerHTML, /skatt-hero-v10/);
    assert.match(viewEl.innerHTML, />22</);
    assert.match(viewEl.innerHTML, /stjärnor samlade/);
    assert.match(viewEl.innerHTML, /Föräldern godkänner snart/);
    assert.match(viewEl.innerHTML, /requestRedeem\('goal-1'\)/);
    assert.doesNotMatch(viewEl.innerHTML, /btp-skatt/);
  });

  it('gate OFF legacy render shows trophy shelf for approved rewards', () => {
    const { renderSkattkammaren, viewEl } = loadRewardsRuntime({ gateOn: false });
    const data = fixture({
      rewardsData: {
        starBalance: 4,
        rewards: [{ id: GOAL_ID, name: 'Filmkväll', star_cost: 10, icon: '🎬' }],
        redemptions: [{
          reward_id: GOAL_ID,
          reward_name: 'Filmkväll',
          reward_icon: '🎬',
          status: 'approved',
          created_at: '2026-05-01T10:00:00.000Z',
        }],
      },
    });
    renderSkattkammaren(data.rewardsData, data.goalData, data.manualData);
    assert.match(viewEl.innerHTML, /Troféhyllan/);
    assert.match(viewEl.innerHTML, /Filmkväll/);
  });
});

describe('#592 reward flow regression — requestRedeem side effects', () => {
  it('successful redeem POSTs redeem API and clears rewardsLoaded cache', async () => {
    const calls = [];
    const context = {
      window: { Platform: null, rewardsLoaded: true },
      navigator: { onLine: true },
      me: { id: 'child-1' },
      Auth: {
        api: async function (url, opts) {
          calls.push({ url: url, opts: opts });
          return { ok: true };
        },
      },
      showToast: function () {},
      document: { getElementById: function () { return null; } },
    };
    vm.runInNewContext(read(REWARDS_PATH), context);
    try {
      await context.window.requestRedeem(GOAL_ID);
    } catch {
      // loadRewards may throw without full DOM — redeem POST is what we assert
    }
    assert.ok(calls.length >= 1);
    assert.equal(calls[0].url, '/api/me/rewards/goal-1/redeem');
    assert.equal(calls[0].opts.method, 'POST');
    assert.equal(context.window.rewardsLoaded, false);
  });
});
