'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveCustodyDateSync,
  ResolverPipeline,
  getHomeIdForDate,
} = require('../src/lib/custody-schedule-engine');
const OverrideResolver = require('../src/lib/custody-schedule-engine/resolvers/override-resolver');
const PatternResolver = require('../src/lib/custody-schedule-engine/resolvers/pattern-resolver');
const FallbackResolver = require('../src/lib/custody-schedule-engine/resolvers/fallback-resolver');
const { findOverrideForDate } = require('../src/lib/custody-schedule-engine/overrides/find-override-for-date');
const { registerPattern, resolvePattern } = require('../src/lib/custody-schedule-engine/patterns');

const HOME_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const HOME_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const HOME_DEFAULT = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const homesById = {
  [HOME_A]: { id: HOME_A, label: 'Hos Anna', color: '#22C55E', icon: null },
  [HOME_B]: { id: HOME_B, label: 'Hos Erik', color: '#4F46E5', icon: '🏠' },
  [HOME_DEFAULT]: { id: HOME_DEFAULT, label: 'Bashem', color: '#F59E0B', icon: null },
};

function weeksCtx(anchor = '2026-06-02') {
  return {
    childId: 'child-1',
    familyId: 'family-1',
    parentHomeId: HOME_A,
    schedule: {
      pattern_type: 'alternate_weeks',
      anchor_date: anchor,
      interval_weeks: 2,
      week_a_home_id: HOME_A,
      week_b_home_id: HOME_B,
      configuration: { home_a: HOME_A, home_b: HOME_B },
    },
    homesById,
    overrides: [],
  };
}

function weekendsCtx(anchor = '2026-06-06') {
  return {
    childId: 'child-1',
    familyId: 'family-1',
    parentHomeId: HOME_DEFAULT,
    schedule: {
      pattern_type: 'alternate_weekends',
      anchor_date: anchor,
      interval_weeks: 2,
      week_a_home_id: HOME_A,
      week_b_home_id: HOME_B,
      configuration: {
        default_home: HOME_DEFAULT,
        weekend_home_a: HOME_A,
        weekend_home_b: HOME_B,
        weekend_start: 'friday',
      },
    },
    homesById,
    overrides: [],
  };
}

describe('custody-schedule-engine', () => {
  it('ResolverPipeline runs override → pattern → fallback in order', () => {
    const calls = [];
    const pipeline = new ResolverPipeline([
      { name: 'a', resolve: () => { calls.push('a'); return null; } },
      { name: 'b', resolve: () => { calls.push('b'); return { activeHome: null, source: 'pattern', patternType: 'alternate_weeks', activePeriod: null }; } },
      { name: 'c', resolve: () => { calls.push('c'); return { activeHome: null, source: 'fallback', patternType: null, activePeriod: null }; } },
    ]);
    pipeline.resolve(weeksCtx(), '2026-06-04');
    assert.deepEqual(calls, ['a', 'b']);
  });

  it('resolvers are isolated — PatternResolver does not read overrides', () => {
    const ctx = weeksCtx();
    ctx.overrides = [{
      start_date: '2026-06-04',
      end_date: '2026-06-30',
      home_id: HOME_B,
      priority: 0,
    }];
    const patternOnly = PatternResolver.resolve(ctx, '2026-06-04');
    assert.equal(patternOnly.activeHome.id, HOME_A);
  });

  it('FallbackResolver does not read schedule', () => {
    const ctx = weeksCtx();
    const fb = FallbackResolver.resolve(ctx, '2026-06-04');
    assert.equal(fb.source, 'fallback');
    assert.equal(fb.activeHome, null);
  });

  it('is deterministic — same input yields same output', () => {
    const ctx = weeksCtx();
    const a = resolveCustodyDateSync(ctx, '2026-06-04');
    const b = resolveCustodyDateSync(ctx, '2026-06-04');
    assert.deepEqual(a, b);
  });

  it('alternate_weeks: first day (anchor Monday)', () => {
    const result = resolveCustodyDateSync(weeksCtx('2026-06-01'), '2026-06-01');
    assert.equal(result.activeHome.id, HOME_A);
    assert.equal(result.activePeriod.start, '2026-06-01');
  });

  it('alternate_weeks: last day before week handoff (Sunday)', () => {
    const result = resolveCustodyDateSync(weeksCtx(), '2026-06-07');
    assert.equal(result.activeHome.id, HOME_A);
    assert.equal(result.nextTransition, '2026-06-08');
  });

  it('alternate_weeks: handoff day (Monday of B week)', () => {
    const result = resolveCustodyDateSync(weeksCtx(), '2026-06-08');
    assert.equal(result.activeHome.id, HOME_B);
    assert.equal(result.source, 'pattern');
  });

  it('alternate_weeks: date before anchor still resolves', () => {
    const result = resolveCustodyDateSync(weeksCtx('2026-06-02'), '2026-05-20');
    assert.equal(result.source, 'pattern');
    assert.ok(result.activeHome);
  });

  it('alternate_weeks: year boundary', () => {
    const result = resolveCustodyDateSync(weeksCtx('2025-12-29'), '2026-01-02');
    assert.equal(result.source, 'pattern');
    assert.ok(result.activeHome);
  });

  it('alternate_weeks: leap year (Feb 29)', () => {
    const result = resolveCustodyDateSync(weeksCtx('2024-02-26'), '2024-02-29');
    assert.equal(result.source, 'pattern');
    assert.ok(result.activeHome);
  });

  it('calendar dates are timezone-agnostic (DST spring forward date)', () => {
    const result = resolveCustodyDateSync(weeksCtx('2026-03-23'), '2026-03-29');
    assert.equal(result.date, '2026-03-29');
    assert.ok(result.activeHome);
  });

  it('alternate_weekends: Mon–Thu uses default_home', () => {
    const result = resolveCustodyDateSync(weekendsCtx(), '2026-06-08');
    assert.equal(result.activeHome.id, HOME_DEFAULT);
    assert.equal(result.activePeriod.start, '2026-06-08');
    assert.equal(result.activePeriod.end, '2026-06-11');
  });

  it('alternate_weekends: Fri–Sun uses weekend home (anchor weekend = A)', () => {
    const result = resolveCustodyDateSync(weekendsCtx('2026-06-06'), '2026-06-06');
    assert.equal(result.activeHome.id, HOME_A);
    assert.equal(result.activePeriod.start, '2026-06-05');
    assert.equal(result.activePeriod.end, '2026-06-07');
  });

  it('alternate_weekends: never null activeHome when schedule exists', () => {
    for (let i = 0; i < 14; i += 1) {
      const d = `2026-06-${String(i + 1).padStart(2, '0')}`;
      const result = resolveCustodyDateSync(weekendsCtx('2026-06-06'), d);
      assert.ok(result.activeHome, `expected home on ${d}`);
    }
  });

  it('override wins over pattern (generic reason — no reason logic)', () => {
    const ctx = weeksCtx();
    ctx.overrides = [{
      start_date: '2026-06-04',
      end_date: '2026-06-10',
      home_id: HOME_B,
      reason: 'jullov',
      priority: 0,
    }];
    const result = resolveCustodyDateSync(ctx, '2026-06-05');
    assert.equal(result.source, 'override');
    assert.equal(result.activeHome.id, HOME_B);
    assert.equal(result.patternType, null);
    assert.equal(result.activePeriod.start, '2026-06-04');
    assert.equal(result.activePeriod.end, '2026-06-10');
  });

  it('nextTransition follows resolver chain when override ends', () => {
    const ctx = weeksCtx();
    ctx.overrides = [{
      start_date: '2026-06-04',
      end_date: '2026-06-06',
      home_id: HOME_B,
      priority: 0,
    }];
    const result = resolveCustodyDateSync(ctx, '2026-06-05');
    assert.equal(result.activeHome.id, HOME_B);
    assert.equal(result.nextTransition, '2026-06-07');
  });

  it('override shifts nextTransition vs pattern-only', () => {
    const withOverride = weeksCtx();
    withOverride.overrides = [{
      start_date: '2026-06-04',
      end_date: '2026-06-14',
      home_id: HOME_B,
      priority: 0,
    }];
    const patternOnly = resolveCustodyDateSync(weeksCtx(), '2026-06-06');
    const overridden = resolveCustodyDateSync(withOverride, '2026-06-06');
    assert.notEqual(patternOnly.nextTransition, overridden.nextTransition);
  });

  it('findOverrideForDate picks higher priority', () => {
    const overrides = [
      { start_date: '2026-07-01', end_date: '2026-07-31', home_id: HOME_A, priority: 1, reason: 'sommar' },
      { start_date: '2026-07-10', end_date: '2026-07-12', home_id: HOME_B, priority: 5, reason: 'domstol' },
    ];
    const hit = findOverrideForDate(overrides, '2026-07-11');
    assert.equal(hit.home_id, HOME_B);
  });

  it('unknown patternType throws', () => {
    const ctx = weeksCtx();
    ctx.schedule.pattern_type = 'not_a_real_pattern';
    assert.throws(
      () => resolveCustodyDateSync(ctx, '2026-06-04'),
      /Okänt pattern_type/
    );
  });

  it('registerPattern plugs in new type without pipeline changes', () => {
    registerPattern('test_stub', {
      resolve: () => ({
        activeHome: { id: HOME_A, label: 'Stub', color: '#000', icon: null },
        patternType: 'test_stub',
        activePeriod: { start: '2026-01-01', end: '2026-01-01' },
      }),
    });
    const out = resolvePattern(
      { pattern_type: 'test_stub', anchor_date: '2026-01-01', configuration: {} },
      homesById,
      '2026-01-01'
    );
    assert.equal(out.patternType, 'test_stub');
  });

  it('fallback when no schedule', () => {
    const ctx = { ...weeksCtx(), schedule: null };
    const result = resolveCustodyDateSync(ctx, '2026-06-04');
    assert.equal(result.source, 'fallback');
    assert.equal(result.activeHome, null);
  });

  it('getHomeIdForDate uses transition pipeline (override + pattern)', () => {
    const ctx = weeksCtx();
    ctx.overrides = [{
      start_date: '2026-06-04',
      end_date: '2026-06-10',
      home_id: HOME_B,
      priority: 0,
    }];
    assert.equal(getHomeIdForDate(ctx, '2026-06-05'), HOME_B);
    assert.equal(getHomeIdForDate(ctx, '2026-06-12'), HOME_B);
  });

  it('resolveCustodyDateSync completes 1000 iterations under 5s total', () => {
    const ctx = weeksCtx();
    const start = performance.now();
    for (let i = 0; i < 1000; i += 1) {
      resolveCustodyDateSync(ctx, '2026-06-04');
    }
    const elapsed = performance.now() - start;
    assert.ok(elapsed < 5000, `expected <5s total, got ${elapsed}ms`);
  });

  it('engine module structure exists', () => {
    assert.equal(OverrideResolver.name, 'override');
    assert.equal(PatternResolver.name, 'pattern');
    assert.equal(FallbackResolver.name, 'fallback');
  });
});
