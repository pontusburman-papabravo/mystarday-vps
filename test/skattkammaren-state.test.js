'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const REWARDS_SRC = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard-rewards.js'), 'utf8');

function loadSkattState() {
  const context = {
    window: {},
    document: { getElementById: function () { return null; } },
    navigator: { onLine: true },
    console: console,
    minimalUiActive: false,
    childUiMagic: false,
    me: { id: 'child-1', name: 'Olle' },
    escHtml: function (s) { return String(s); },
    Auth: { api: async function () { return {}; } },
    rewardsLoaded: false,
  };
  vm.runInNewContext(REWARDS_SRC, context);
  return {
    resolveSkattState: context.window.resolveSkattState,
    sortRewardsForList: context.window.sortRewardsForList,
    SKATT_STATES: context.window.SKATT_STATES,
  };
}

const GOAL_ID = 'goal-reward-1';
const OTHER_ID = 'other-reward-2';

function goalData(overrides) {
  return Object.assign({
    goal: {
      reward_id: GOAL_ID,
      reward_name: 'Filmkväll',
      star_cost: 20,
    },
    progress_pct: 50,
    pending_change_request: null,
  }, overrides || {});
}

function rewardsData(overrides) {
  return Object.assign({
    starBalance: 10,
    rewards: [
      { id: GOAL_ID, name: 'Filmkväll', star_cost: 20, icon: '🎬' },
      { id: OTHER_ID, name: 'Glass', star_cost: 15, icon: '🍦' },
    ],
    redemptions: [],
  }, overrides || {});
}

describe('resolveSkattState — exclusive state machine', () => {
  const { resolveSkattState, sortRewardsForList, SKATT_STATES } = loadSkattState();
  const NOW = Date.parse('2026-07-01T12:00:00.000Z');

  it('No goal — pick_goal primary when no goal set', () => {
    const state = resolveSkattState(rewardsData(), { goal: null, progress_pct: 0 }, { now: NOW });
    assert.equal(state.state, SKATT_STATES.NO_GOAL);
    assert.equal(state.primaryAction.type, 'pick_goal');
    assert.equal(state.progressLabel, 'Välj vad du sparar till');
  });

  it('Collecting — no primary when goal exists but not affordable', () => {
    const state = resolveSkattState(
      rewardsData({ starBalance: 8 }),
      goalData({ progress_pct: 40 }),
      { now: NOW }
    );
    assert.equal(state.state, SKATT_STATES.COLLECTING);
    assert.equal(state.primaryAction, null);
    assert.equal(state.collectHint.starsToGo, 12);
  });

  it('Redeem available — redeem primary when goal affordable and no pending', () => {
    const state = resolveSkattState(
      rewardsData({ starBalance: 25 }),
      goalData({ progress_pct: 100 }),
      { now: NOW }
    );
    assert.equal(state.state, SKATT_STATES.REDEEM_AVAILABLE);
    assert.equal(state.primaryAction.type, 'redeem');
    assert.equal(state.primaryAction.rewardId, GOAL_ID);
  });

  it('Awaiting decision — no primary when any pending exists, even with overflow stars', () => {
    const state = resolveSkattState(
      rewardsData({
        starBalance: 40,
        redemptions: [{
          reward_id: GOAL_ID,
          reward_name: 'Filmkväll',
          status: 'pending',
          created_at: '2026-07-01T11:00:00.000Z',
        }],
      }),
      goalData({ progress_pct: 100 }),
      { now: NOW }
    );
    assert.equal(state.state, SKATT_STATES.AWAITING_DECISION);
    assert.equal(state.primaryAction, null);
    assert.equal(state.pending.length, 1);
  });

  it('Awaiting decision — pending goal change blocks primary CTA', () => {
    const state = resolveSkattState(
      rewardsData({ starBalance: 25 }),
      goalData({ pending_change_request: { to_reward_id: OTHER_ID } }),
      { now: NOW }
    );
    assert.equal(state.state, SKATT_STATES.AWAITING_DECISION);
    assert.equal(state.primaryAction, null);
    assert.ok(state.pendingChangeReq);
  });

  it('Denied — recent denial wins over redeem available', () => {
    const state = resolveSkattState(
      rewardsData({
        starBalance: 30,
        redemptions: [{
          reward_id: GOAL_ID,
          reward_name: 'Filmkväll',
          status: 'denied',
          created_at: '2026-07-01T11:59:00.000Z',
        }],
      }),
      goalData({ progress_pct: 100 }),
      { now: NOW }
    );
    assert.equal(state.state, SKATT_STATES.DENIED);
    assert.equal(state.primaryAction, null);
    assert.equal(state.recentDenied.length, 1);
  });

  it('Completed — recent approval wins over redeem/collecting', () => {
    const state = resolveSkattState(
      rewardsData({
        starBalance: 5,
        redemptions: [{
          reward_id: GOAL_ID,
          reward_name: 'Filmkväll',
          reward_icon: '🎬',
          status: 'approved',
          created_at: '2026-07-01T11:59:59.000Z',
        }],
      }),
      goalData({ progress_pct: 25 }),
      { now: NOW }
    );
    assert.equal(state.state, SKATT_STATES.COMPLETED);
    assert.equal(state.primaryAction, null);
    assert.equal(state.completedReward.reward_name, 'Filmkväll');
  });

  it('Completed — expires after 2s per vision G-04', () => {
    const fresh = resolveSkattState(
      rewardsData({
        starBalance: 5,
        redemptions: [{
          reward_id: GOAL_ID,
          status: 'approved',
          created_at: '2026-07-01T11:59:59.000Z',
        }],
      }),
      goalData({ progress_pct: 25 }),
      { now: NOW }
    );
    assert.equal(fresh.state, SKATT_STATES.COMPLETED);

    const stale = resolveSkattState(
      rewardsData({
        starBalance: 5,
        redemptions: [{
          reward_id: GOAL_ID,
          status: 'approved',
          created_at: '2026-07-01T11:59:57.000Z',
        }],
      }),
      goalData({ progress_pct: 25 }),
      { now: NOW }
    );
    assert.equal(stale.state, SKATT_STATES.COLLECTING);
  });

  it('priority order — pending beats completed flash', () => {
    const state = resolveSkattState(
      rewardsData({
        starBalance: 40,
        redemptions: [
          {
            reward_id: GOAL_ID,
            status: 'pending',
            created_at: '2026-07-01T11:55:00.000Z',
          },
          {
            reward_id: OTHER_ID,
            status: 'approved',
            created_at: '2026-07-01T11:59:59.000Z',
          },
        ],
      }),
      goalData({ progress_pct: 100 }),
      { now: NOW }
    );
    assert.equal(state.state, SKATT_STATES.AWAITING_DECISION);
  });

  it('inga belöningar — still resolves No goal with empty rewards', () => {
    const state = resolveSkattState(
      rewardsData({ rewards: [], starBalance: 0 }),
      { goal: null, progress_pct: 0 },
      { now: NOW }
    );
    assert.equal(state.state, SKATT_STATES.NO_GOAL);
    assert.equal(state.primaryAction.type, 'pick_goal');
  });
});

describe('sortRewardsForList — vision sort order', () => {
  const { sortRewardsForList } = loadSkattState();

  it('active goal first, then soon affordable by progress, then rest', () => {
    const rewards = [
      { id: 'low', name: 'Låg', star_cost: 100 },
      { id: GOAL_ID, name: 'Filmkväll', star_cost: 20 },
      { id: OTHER_ID, name: 'Glass', star_cost: 15 },
    ];
    const goal = { reward_id: GOAL_ID, reward_name: 'Filmkväll', star_cost: 20 };
    const sorted = sortRewardsForList(rewards, 12, [], goal);
    assert.equal(sorted[0].id, GOAL_ID);
    assert.equal(sorted[1].id, OTHER_ID);
    assert.equal(sorted[2].id, 'low');
  });
});
