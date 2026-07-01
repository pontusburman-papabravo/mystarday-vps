'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveCustodyDateSync,
  ResolverPipeline,
} = require('../src/lib/custody-schedule-engine');
const OverrideResolver = require('../src/lib/custody-schedule-engine/resolvers/override-resolver');
const PatternResolver = require('../src/lib/custody-schedule-engine/resolvers/pattern-resolver');
const FallbackResolver = require('../src/lib/custody-schedule-engine/resolvers/fallback-resolver');
const { findOverrideForDate } = require('../src/lib/custody-schedule-engine/overrides/find-override-for-date');

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

  it('alternate_weeks: anchor week is home A', () => {
    const result = resolveCustodyDateSync(weeksCtx(), '2026-06-04');
    assert.equal(result.source, 'pattern');
    assert.equal(result.patternType, 'alternate_weeks');
    assert.equal(result.activeHome.id, HOME_A);
    assert.equal(result.isParentDay, true);
  });

  it('alternate_weeks: following week is home B', () => {
    const result = resolveCustodyDateSync(weeksCtx(), '2026-06-11');
    assert.equal(result.activeHome.id, HOME_B);
    assert.equal(result.isParentDay, false);
  });

  it('alternate_weeks: leap year date resolves', () => {
    const result = resolveCustodyDateSync(weeksCtx('2024-02-26'), '2024-02-29');
    assert.equal(result.source, 'pattern');
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

  it('alternate_weekends: never returns null activeHome when schedule exists', () => {
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
  });

  it('findOverrideForDate picks higher priority', () => {
    const overrides = [
      { start_date: '2026-07-01', end_date: '2026-07-31', home_id: HOME_A, priority: 1, reason: 'sommar' },
      { start_date: '2026-07-10', end_date: '2026-07-12', home_id: HOME_B, priority: 5, reason: 'domstol' },
    ];
    const hit = findOverrideForDate(overrides, '2026-07-11');
    assert.equal(hit.home_id, HOME_B);
  });

  it('fallback when no schedule', () => {
    const ctx = { ...weeksCtx(), schedule: null };
    const result = resolveCustodyDateSync(ctx, '2026-06-04');
    assert.equal(result.source, 'fallback');
    assert.equal(result.activeHome, null);
  });

  it('exposes nextTransition when home changes', () => {
    const result = resolveCustodyDateSync(weeksCtx(), '2026-06-06');
    assert.equal(result.activeHome.id, HOME_A);
    assert.equal(result.nextTransition, '2026-06-08');
  });

  it('resolveCustodyDateSync completes 1000 iterations under 5ms each', () => {
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
