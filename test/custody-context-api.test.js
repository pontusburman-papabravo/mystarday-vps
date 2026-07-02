'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  LEGACY_API_FIELDS,
  legacyWeekVariant,
  buildCustodyContextFromEngine,
  inclusiveDayCount,
} = require('../src/lib/custody-context-api');
const { resolveCustodyDateSync } = require('../src/lib/custody-schedule-engine');

const ROOT = path.join(__dirname, '..');

const HOME_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const HOME_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const HOME_DEFAULT = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const homesById = {
  [HOME_A]: { id: HOME_A, label: 'Hos Anna', color: '#22C55E', icon: null },
  [HOME_B]: { id: HOME_B, label: 'Hos Erik', color: '#4F46E5', icon: '🏠' },
  [HOME_DEFAULT]: { id: HOME_DEFAULT, label: 'Bashem', color: '#F59E0B', icon: null },
};

const CUSTODY_CONTEXT_FIELDS = [
  'date',
  'activeHome',
  'source',
  'patternType',
  'activePeriod',
  'nextTransition',
  'previousTransition',
  'isParentDay',
];

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

function assertCustodyContextShape(payload) {
  for (const field of CUSTODY_CONTEXT_FIELDS) {
    assert.ok(field in payload, `missing CustodyContext field: ${field}`);
  }
}

describe('custody-context-api', () => {
  it('module resolves only via resolveCustodyDateSync (no custody-resolver)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/lib/custody-context-api.js'), 'utf8');
    assert.match(src, /resolveCustodyDateSync/);
    assert.doesNotMatch(src, /custody-resolver/);
    assert.doesNotMatch(src, /getWeekVariantForDate/);
  });

  it('legacyWeekVariant is null for alternate_weekends (no A/B alias)', () => {
    const schedule = weekendsCtx().schedule;
    assert.equal(legacyWeekVariant(schedule, homesById[HOME_A]), null);
    assert.equal(legacyWeekVariant(schedule, homesById[HOME_DEFAULT]), null);
  });

  it('legacyWeekVariant maps active home to a/b only for alternate_weeks', () => {
    const schedule = weeksCtx().schedule;
    assert.equal(legacyWeekVariant(schedule, homesById[HOME_A]), 'a');
    assert.equal(legacyWeekVariant(schedule, homesById[HOME_B]), 'b');
    assert.equal(legacyWeekVariant(schedule, null), null);
  });

  it('fallback (no schedule) returns active:false via engine', () => {
    const ctx = { ...weeksCtx(), schedule: null };
    const engineResult = resolveCustodyDateSync(ctx, '2026-06-04');
    assert.equal(engineResult.source, 'fallback');
    assert.equal(engineResult.activeHome, null);

    const payload = buildCustodyContextFromEngine(ctx, '2026-06-04');
    assert.deepEqual(payload, { active: false });
  });

  it('alternate_weeks: CustodyContext fields + legacy aliases', () => {
    const payload = buildCustodyContextFromEngine(weeksCtx(), '2026-06-04');

    assert.equal(payload.active, true);
    assertCustodyContextShape(payload);
    assert.equal(payload.date, '2026-06-04');
    assert.equal(payload.activeHome.id, HOME_A);
    assert.equal(payload.source, 'pattern');
    assert.equal(payload.patternType, 'alternate_weeks');
    assert.equal(payload.isParentDay, true);
    assert.equal(payload.variant, 'a');
    assert.equal(payload.isMyDay, true);
    assert.equal(payload.home.id, HOME_A);
    assert.equal(payload.weekMonday, '2026-06-01');
    assert.ok(payload.weekBanner);
    assert.equal(payload.weekBanner.label, 'Hos Anna');
    assert.equal(payload.weekBanner.variant, 'a');
    assert.equal(payload.nextHandoff, payload.nextTransition);
    assert.equal(payload.previousHandoff, payload.previousTransition);

    for (const field of LEGACY_API_FIELDS) {
      assert.ok(field in payload, `missing legacy field: ${field}`);
    }
  });

  it('alternate_weekends: CustodyContext from engine, legacy variant null', () => {
    const payload = buildCustodyContextFromEngine(weekendsCtx(), '2026-06-08');

    assert.equal(payload.active, true);
    assertCustodyContextShape(payload);
    assert.equal(payload.patternType, 'alternate_weekends');
    assert.equal(payload.activeHome.id, HOME_DEFAULT);
    assert.equal(payload.variant, null);
    assert.equal(payload.weekBanner.variant, null);
    assert.equal(payload.isParentDay, true);
  });

  it('GET /context route uses engine via custody-context-api', () => {
    const routes = fs.readFileSync(path.join(ROOT, 'src/routes/family/custody.js'), 'utf8');
    assert.match(routes, /buildCustodyContextResponse/);
    assert.doesNotMatch(routes, /custody-resolver/);
  });

  it('inclusiveDayCount counts calendar days inclusively', () => {
    assert.equal(inclusiveDayCount('2026-06-01', '2026-06-01'), 1);
    assert.equal(inclusiveDayCount('2026-06-01', '2026-06-28'), 28);
    assert.equal(inclusiveDayCount('2026-06-01', '2026-06-29'), 29);
  });

  it('GET /context-range route is mounted', () => {
    const routes = fs.readFileSync(path.join(ROOT, 'src/routes/family/custody.js'), 'utf8');
    assert.match(routes, /buildCustodyContextRangeResponse/);
    assert.match(routes, /\/context-range/);
  });
});
