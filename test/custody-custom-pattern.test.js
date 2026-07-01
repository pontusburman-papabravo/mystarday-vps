'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveCustodyDateSync,
} = require('../src/lib/custody-schedule-engine');
const { resolveCustom, homeIdForDate } = require('../src/lib/custody-schedule-engine/patterns/custom');
const {
  isMondayAnchor,
  validateCustomConfiguration,
} = require('../src/lib/custody-custom-config');

const HOME_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const HOME_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const homesById = {
  [HOME_A]: { id: HOME_A, label: 'Hos Anna', color: '#22C55E', icon: null },
  [HOME_B]: { id: HOME_B, label: 'Hos Erik', color: '#4F46E5', icon: '🏠' },
};

function weekRow(homeByDay) {
  return {
    mon: homeByDay.mon || HOME_A,
    tue: homeByDay.tue || HOME_A,
    wed: homeByDay.wed || HOME_A,
    thu: homeByDay.thu || HOME_A,
    fri: homeByDay.fri || HOME_A,
    sat: homeByDay.sat || HOME_A,
    sun: homeByDay.sun || HOME_A,
  };
}

function customCtx({ anchor = '2026-06-01', cycleWeeks }) {
  return {
    childId: 'child-1',
    familyId: 'family-1',
    parentHomeId: HOME_A,
    schedule: {
      pattern_type: 'custom',
      anchor_date: anchor,
      configuration: { cycle_weeks: cycleWeeks },
    },
    homesById,
    overrides: [],
  };
}

/** 1-week: Mon–Tue A, Wed–Sun B */
const CYCLE_1W = [
  weekRow({ mon: HOME_A, tue: HOME_A, wed: HOME_B, thu: HOME_B, fri: HOME_B, sat: HOME_B, sun: HOME_B }),
];

/** 2-week alternating full weeks */
const CYCLE_2W = [
  weekRow({ mon: HOME_A, tue: HOME_A, wed: HOME_A, thu: HOME_A, fri: HOME_A, sat: HOME_A, sun: HOME_A }),
  weekRow({ mon: HOME_B, tue: HOME_B, wed: HOME_B, thu: HOME_B, fri: HOME_B, sat: HOME_B, sun: HOME_B }),
];

/** 4-week: A, B, A, B */
const CYCLE_4W = [
  weekRow({ mon: HOME_A }),
  weekRow({ mon: HOME_B }),
  weekRow({ mon: HOME_A }),
  weekRow({ mon: HOME_B }),
];

describe('custody-custom-config', () => {
  it('isMondayAnchor accepts Monday only', () => {
    assert.equal(isMondayAnchor('2026-06-01'), true);
    assert.equal(isMondayAnchor('2026-06-02'), false);
  });

  it('validateCustomConfiguration rejects single-home cycle', () => {
    const allA = weekRow({ mon: HOME_A, tue: HOME_A, wed: HOME_A, thu: HOME_A, fri: HOME_A, sat: HOME_A, sun: HOME_A });
    const result = validateCustomConfiguration({ cycle_weeks: [allA] }, [HOME_A, HOME_B]);
    assert.equal(result.ok, false);
    assert.match(result.error, /två olika hem/);
  });

  it('validateCustomConfiguration accepts 2-week cycle', () => {
    const result = validateCustomConfiguration({ cycle_weeks: CYCLE_2W }, [HOME_A, HOME_B]);
    assert.equal(result.ok, true);
    assert.equal(result.cycleWeeks.length, 2);
  });
});

describe('custody custom pattern (FEAT-1B PR-B)', () => {
  it('1-week cycle: home switches mid-week', () => {
    const ctx = customCtx({ cycleWeeks: CYCLE_1W });
    const tue = resolveCustodyDateSync(ctx, '2026-06-02');
    const wed = resolveCustodyDateSync(ctx, '2026-06-03');
    assert.equal(tue.activeHome.id, HOME_A);
    assert.equal(wed.activeHome.id, HOME_B);
    assert.equal(tue.patternType, 'custom');
    assert.equal(tue.activePeriod.start, '2026-06-01');
    assert.equal(tue.activePeriod.end, '2026-06-02');
    assert.equal(wed.nextTransition, '2026-06-08');
  });

  it('2-week cycle: second week uses week 2 template', () => {
    const ctx = customCtx({ cycleWeeks: CYCLE_2W });
    const w1 = resolveCustodyDateSync(ctx, '2026-06-08');
    assert.equal(w1.activeHome.id, HOME_B);
    assert.equal(w1.activePeriod.start, '2026-06-08');
    assert.equal(w1.activePeriod.end, '2026-06-14');
  });

  it('4-week cycle repeats after four weeks', () => {
    const ctx = customCtx({ cycleWeeks: CYCLE_4W, anchor: '2026-06-01' });
    const week5 = resolveCustodyDateSync(ctx, '2026-06-29');
    const week1 = resolveCustodyDateSync(ctx, '2026-06-01');
    assert.equal(week5.activeHome.id, week1.activeHome.id);
    assert.equal(week5.activeHome.id, HOME_A);
  });

  it('date before anchor still resolves (negative week offset)', () => {
    const ctx = customCtx({ cycleWeeks: CYCLE_2W, anchor: '2026-06-01' });
    const result = resolveCustodyDateSync(ctx, '2026-05-25');
    assert.equal(result.source, 'pattern');
    assert.ok(result.activeHome);
  });

  it('year boundary', () => {
    const ctx = customCtx({ cycleWeeks: CYCLE_2W, anchor: '2025-12-29' });
    const result = resolveCustodyDateSync(ctx, '2026-01-05');
    assert.equal(result.source, 'pattern');
    assert.ok(result.activeHome);
  });

  it('nextTransition on handoff day', () => {
    const ctx = customCtx({ cycleWeeks: CYCLE_1W });
    const tue = resolveCustodyDateSync(ctx, '2026-06-02');
    assert.equal(tue.nextTransition, '2026-06-03');
  });

  it('override wins over custom pattern', () => {
    const ctx = customCtx({ cycleWeeks: CYCLE_1W });
    ctx.overrides = [{
      start_date: '2026-06-02',
      end_date: '2026-06-04',
      home_id: HOME_B,
      priority: 0,
    }];
    const result = resolveCustodyDateSync(ctx, '2026-06-02');
    assert.equal(result.source, 'override');
    assert.equal(result.activeHome.id, HOME_B);
    assert.equal(result.patternType, null);
  });

  it('override shifts nextTransition vs custom-only', () => {
    const ctx = customCtx({ cycleWeeks: CYCLE_1W });
    ctx.overrides = [{
      start_date: '2026-06-02',
      end_date: '2026-06-02',
      home_id: HOME_B,
      priority: 0,
    }];
    const overridden = resolveCustodyDateSync(ctx, '2026-06-02');
    const patternOnly = resolveCustodyDateSync(customCtx({ cycleWeeks: CYCLE_1W }), '2026-06-02');
    assert.notEqual(overridden.nextTransition, patternOnly.nextTransition);
  });

  it('homeIdForDate is deterministic across cycle boundary', () => {
    const schedule = {
      anchor_date: '2026-06-01',
      configuration: { cycle_weeks: CYCLE_2W },
    };
    assert.equal(homeIdForDate(schedule, '2026-06-01'), HOME_A);
    assert.equal(homeIdForDate(schedule, '2026-06-15'), HOME_A);
  });

  it('resolveCustom throws when cycle_weeks missing', () => {
    assert.throws(
      () => resolveCustom({ configuration: {} }, homesById, '2026-06-01'),
      /cycle_weeks/
    );
  });

  it('custody route accepts custom pattern_type', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const routes = fs.readFileSync(
      path.join(__dirname, '../src/routes/family/custody.js'),
      'utf8'
    );
    assert.match(routes, /PATTERN_CUSTOM/);
    assert.match(routes, /validateCustomConfiguration/);
    assert.match(routes, /anchor_date måste vara en måndag/);
  });
});
