'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  computeTransitionPhase,
  minutesUntilStart,
  normalizeLeadMinutes,
  getTransitionFromStartTime,
} = require('../src/lib/transition-support');

describe('transition-support phase computation', () => {
  test('normalizeLeadMinutes defaults to [5, 1]', () => {
    assert.deepEqual(normalizeLeadMinutes([]), [5, 1]);
    assert.deepEqual(normalizeLeadMinutes(null), [5, 1]);
  });

  test('normalizeLeadMinutes sorts descending and dedupes', () => {
    assert.deepEqual(normalizeLeadMinutes([1, 5, 3, 5]), [5, 3, 1]);
  });

  test('computeTransitionPhase: soon when far from start', () => {
    const r = computeTransitionPhase(12, [5, 1]);
    assert.equal(r.phase, 'soon');
    assert.equal(r.label, 'Snart');
  });

  test('computeTransitionPhase: Om 5 min', () => {
    const r = computeTransitionPhase(4.5, [5, 1]);
    assert.equal(r.phase, 'in_5');
    assert.equal(r.label, 'Om 5 min');
  });

  test('computeTransitionPhase: Om 1 min', () => {
    const r = computeTransitionPhase(0.5, [1]);
    assert.equal(r.phase, 'in_1');
    assert.equal(r.label, 'Om 1 min');
  });

  test('computeTransitionPhase: Nu at or past start', () => {
    assert.equal(computeTransitionPhase(0, [5, 1]).label, 'Nu');
    assert.equal(computeTransitionPhase(-2, [5, 1]).label, 'Nu');
  });

  test('getTransitionFromStartTime uses clock', () => {
    const now = new Date();
    now.setHours(8, 2, 0, 0);
    const r = getTransitionFromStartTime('08:05', { leadMinutes: [5, 1], now });
    assert.equal(r.label, 'Om 5 min');
  });

  test('minutesUntilStart parses HH:MM', () => {
    const now = new Date();
    now.setHours(7, 55, 0, 0);
    const mins = minutesUntilStart('08:00', now);
    assert.ok(mins > 4.9 && mins < 5.1);
  });
});
