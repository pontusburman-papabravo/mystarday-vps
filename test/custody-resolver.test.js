'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  diffCalendarWeeks,
  getWeekVariantForDate,
  getHomeForDate,
  isParentCustodyDay,
} = require('../src/lib/custody-resolver');

describe('custody-resolver', () => {
  const pattern = {
    anchor_date: '2026-06-02',
    interval_weeks: 2,
    week_a_home_id: 'home-a',
    week_b_home_id: 'home-b',
  };
  const homes = {
    'home-a': { id: 'home-a', label: 'Hos mamma', color: '#22C55E' },
    'home-b': { id: 'home-b', label: 'Hos pappa', color: '#4F46E5' },
  };

  it('anchor week is variant a', () => {
    assert.equal(getWeekVariantForDate(pattern, '2026-06-04'), 'a');
  });

  it('following week is variant b', () => {
    assert.equal(getWeekVariantForDate(pattern, '2026-06-11'), 'b');
  });

  it('two weeks later back to a', () => {
    assert.equal(getWeekVariantForDate(pattern, '2026-06-18'), 'a');
  });

  it('getHomeForDate returns label and color', () => {
    const ctx = getHomeForDate(pattern, homes, '2026-06-04');
    assert.equal(ctx.variant, 'a');
    assert.equal(ctx.label, 'Hos mamma');
    assert.equal(ctx.color, '#22C55E');
  });

  it('isParentCustodyDay matches home for date', () => {
    assert.equal(isParentCustodyDay('home-a', pattern, '2026-06-04'), true);
    assert.equal(isParentCustodyDay('home-b', pattern, '2026-06-04'), false);
  });

  it('diffCalendarWeeks counts Mondays', () => {
    assert.equal(diffCalendarWeeks('2026-06-02', '2026-06-09'), 1);
    assert.equal(diffCalendarWeeks('2026-06-02', '2026-06-02'), 0);
  });
});
