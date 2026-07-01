'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  addDaysIso,
  getWeekMondayIso,
  getIsoWeekNumber,
  getIsoWeekYearAndNumber,
} = require('../src/lib/date-utils');

describe('date-utils', () => {
  describe('addDaysIso', () => {
    it('adds days forward across month boundary', () => {
      assert.equal(addDaysIso('2026-01-30', 3), '2026-02-02');
    });

    it('subtracts days backward', () => {
      assert.equal(addDaysIso('2026-03-01', -1), '2026-02-28');
    });
  });

  describe('getWeekMondayIso', () => {
    it('returns Monday for a Wednesday', () => {
      assert.equal(getWeekMondayIso('2026-06-04'), '2026-06-01');
    });

    it('returns same Monday when input is already Monday', () => {
      assert.equal(getWeekMondayIso('2026-06-01'), '2026-06-01');
    });

    it('returns previous Monday for Sunday', () => {
      assert.equal(getWeekMondayIso('2026-06-07'), '2026-06-01');
    });
  });

  describe('ISO week helpers', () => {
    it('getIsoWeekNumber returns week 23 for 2026-06-04', () => {
      assert.equal(getIsoWeekNumber(new Date('2026-06-04T12:00:00')), 23);
    });

    it('getIsoWeekYearAndNumber returns year and week', () => {
      assert.deepEqual(
        getIsoWeekYearAndNumber(new Date('2026-06-04T12:00:00')),
        { year: 2026, week: 23 }
      );
    });

    it('week 1 straddles year boundary (ISO week-year)', () => {
      assert.deepEqual(
        getIsoWeekYearAndNumber(new Date('2026-01-01T12:00:00')),
        { year: 2026, week: 1 }
      );
    });
  });
});
