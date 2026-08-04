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

  test('rollout allowlist defaults to founder email', () => {
    const { getAllowlist } = require('../src/lib/activity-timer-rollout');
    const list = getAllowlist();
    assert.ok(list.includes('pontus@burman.cc'));
  });
});
