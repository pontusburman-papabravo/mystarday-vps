'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const analyticsCalls = [];
const flagEnabled = { value: true };
const lifetimeCompletions = { value: 0 };
const existingEvents = new Set();

const dbPath = require.resolve('../src/lib/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    query: async (sql, params) => {
      if (sql.includes('FROM analytics_events')) {
        const key = `${params[0]}:${params[1]}:${params[2]}`;
        return { rows: existingEvents.has(key) ? [{ '?': 1 }] : [] };
      }
      return { rows: [] };
    },
  },
};

const analyticsPath = require.resolve('../db/analytics');
require.cache[analyticsPath] = {
  id: analyticsPath,
  filename: analyticsPath,
  loaded: true,
  exports: {
    track: async (familyId, eventType, metadata) => {
      analyticsCalls.push({ familyId, eventType, metadata });
      const childId = metadata?.child_id;
      if (childId) existingEvents.add(`${familyId}:${eventType}:${childId}`);
    },
  },
};

const flagsPath = require.resolve('../src/lib/activation-flags');
require.cache[flagsPath] = {
  id: flagsPath,
  filename: flagsPath,
  loaded: true,
  exports: {
    FLAG_KEYS: { firstStarMode: 'activation_first_star_mode_v1' },
    isActivationFlagEnabled: async () => flagEnabled.value,
  },
};

const firstStarPath = require.resolve('../src/lib/first-star-mode');
require.cache[firstStarPath] = {
  id: firstStarPath,
  filename: firstStarPath,
  loaded: true,
  exports: {
    countLifetimeCompletions: async () => lifetimeCompletions.value,
    resolveFirstStarMode: () => false,
    applyFirstStarModeFilter: (items) => items,
  },
};

const {
  EVENT_FIRST_STAR_MODE_SHOWN,
  EVENT_FIRST_COMPLETION,
  EVENT_FIRST_STAR_MODE_EXITED,
  maybeTrackChildLogin,
  maybeTrackFirstStarModeShown,
  maybeTrackFirstStarModeActivity,
} = require('../src/lib/first-star-mode-analytics');

describe('first-star-mode-analytics', () => {
  beforeEach(() => {
    analyticsCalls.length = 0;
    existingEvents.clear();
    flagEnabled.value = true;
    lifetimeCompletions.value = 0;
  });

  it('maybeTrackChildLogin emits child_login when flag on', async () => {
    await maybeTrackChildLogin({ familyId: 'fam-1', childId: 'child-1' });
    assert.equal(analyticsCalls.length, 1);
    assert.equal(analyticsCalls[0].eventType, 'child_login');
    assert.equal(analyticsCalls[0].metadata.child_id, 'child-1');
  });

  it('maybeTrackChildLogin is silent when flag off', async () => {
    flagEnabled.value = false;
    await maybeTrackChildLogin({ familyId: 'fam-1', childId: 'child-1' });
    assert.equal(analyticsCalls.length, 0);
  });

  it('maybeTrackFirstStarModeShown dedupes per child', async () => {
    await maybeTrackFirstStarModeShown({ familyId: 'fam-1', childId: 'child-1' });
    await maybeTrackFirstStarModeShown({ familyId: 'fam-1', childId: 'child-1' });
    assert.equal(analyticsCalls.length, 1);
    assert.equal(analyticsCalls[0].eventType, EVENT_FIRST_STAR_MODE_SHOWN);
  });

  it('maybeTrackFirstStarModeShown skips when child already has completions', async () => {
    lifetimeCompletions.value = 2;
    await maybeTrackFirstStarModeShown({ familyId: 'fam-1', childId: 'child-1' });
    assert.equal(analyticsCalls.length, 0);
  });

  it('maybeTrackFirstStarModeActivity emits completion funnel once', async () => {
    await maybeTrackFirstStarModeActivity({
      familyId: 'fam-1',
      childId: 'child-1',
      dailyLogItemId: 'item-1',
      lifetimeCompletionsBefore: 0,
    });
    assert.equal(analyticsCalls.length, 3);
    const types = analyticsCalls.map((c) => c.eventType);
    assert.ok(types.includes('activity_completed'));
    assert.ok(types.includes(EVENT_FIRST_COMPLETION));
    assert.ok(types.includes(EVENT_FIRST_STAR_MODE_EXITED));
  });

  it('maybeTrackFirstStarModeActivity dedupes first_completion per child', async () => {
    await maybeTrackFirstStarModeActivity({
      familyId: 'fam-1',
      childId: 'child-1',
      dailyLogItemId: 'item-1',
      lifetimeCompletionsBefore: 0,
    });
    analyticsCalls.length = 0;
    await maybeTrackFirstStarModeActivity({
      familyId: 'fam-1',
      childId: 'child-1',
      dailyLogItemId: 'item-2',
      lifetimeCompletionsBefore: 0,
    });
    const types = analyticsCalls.map((c) => c.eventType);
    assert.equal(types.filter((t) => t === EVENT_FIRST_COMPLETION).length, 0);
    assert.equal(types.filter((t) => t === EVENT_FIRST_STAR_MODE_EXITED).length, 0);
    assert.equal(types.filter((t) => t === 'activity_completed').length, 1);
  });

  it('maybeTrackFirstStarModeActivity skips when not in first-star mode', async () => {
    await maybeTrackFirstStarModeActivity({
      familyId: 'fam-1',
      childId: 'child-1',
      dailyLogItemId: 'item-1',
      lifetimeCompletionsBefore: 3,
    });
    assert.equal(analyticsCalls.length, 0);
  });

  it('maybeTrackFirstStarModeActivity is silent when flag off', async () => {
    flagEnabled.value = false;
    await maybeTrackFirstStarModeActivity({
      familyId: 'fam-1',
      childId: 'child-1',
      dailyLogItemId: 'item-1',
      lifetimeCompletionsBefore: 0,
    });
    assert.equal(analyticsCalls.length, 0);
  });
});
