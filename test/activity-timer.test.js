'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  MIN_DURATION_SECONDS,
  MAX_DURATION_SECONDS,
  normalizeDurationSeconds,
  isTimerConfigured,
} = require('../src/lib/activity-timer');

describe('activity-timer server helpers', () => {
  test('normalizeDurationSeconds: null and empty = disabled', () => {
    assert.equal(normalizeDurationSeconds(null), null);
    assert.equal(normalizeDurationSeconds(''), null);
  });

  test('normalizeDurationSeconds: valid range', () => {
    assert.equal(normalizeDurationSeconds(5), 5);
    assert.equal(normalizeDurationSeconds('120'), 120);
    assert.equal(normalizeDurationSeconds(3600), 3600);
  });

  test('normalizeDurationSeconds: out of range or invalid', () => {
    assert.equal(normalizeDurationSeconds(4), undefined);
    assert.equal(normalizeDurationSeconds(3601), undefined);
    assert.equal(normalizeDurationSeconds('abc'), undefined);
    assert.equal(normalizeDurationSeconds(undefined), undefined);
  });

  test('isTimerConfigured derives from duration_seconds only', () => {
    assert.equal(isTimerConfigured(null), false);
    assert.equal(isTimerConfigured(4), false);
    assert.equal(isTimerConfigured(MIN_DURATION_SECONDS), true);
    assert.equal(isTimerConfigured(MAX_DURATION_SECONDS), true);
  });

  test('activityTimerV2EnabledForChild follows child master switch', () => {
    const { activityTimerV2EnabledForChild } = require('../src/lib/activity-timer-rollout');
    assert.equal(activityTimerV2EnabledForChild(true), true);
    assert.equal(activityTimerV2EnabledForChild(false), false);
  });

  test('rollout kill switch disables child v2', () => {
    const prev = process.env.ACTIVITY_TIMER_V2_DISABLED;
    process.env.ACTIVITY_TIMER_V2_DISABLED = 'true';
    const rolloutPath = require.resolve('../src/lib/activity-timer-rollout');
    delete require.cache[rolloutPath];
    const { isRolloutDisabled, activityTimerV2EnabledForChild } = require('../src/lib/activity-timer-rollout');
    assert.equal(isRolloutDisabled(), true);
    assert.equal(activityTimerV2EnabledForChild(true), false);
    process.env.ACTIVITY_TIMER_V2_DISABLED = prev;
    delete require.cache[rolloutPath];
  });

  test('rollout allowlist helper still resolves founder email', () => {
    const { getAllowlist } = require('../src/lib/activity-timer-rollout');
    const list = getAllowlist();
    assert.ok(list.includes('pontus@burman.cc'));
  });
});
