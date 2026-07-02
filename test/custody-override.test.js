'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  validateOverrideInput,
  isIsoDate,
} = require('../src/lib/custody-override-config');
const { findOverrideForDate } = require('../src/lib/custody-schedule-engine/overrides/find-override-for-date');
const { resolveCustodyDateSync } = require('../src/lib/custody-schedule-engine');

const HOME_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const HOME_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const ROOT = path.join(__dirname, '..');

function weeksCtx() {
  return {
    childId: 'child-1',
    familyId: 'family-1',
    parentHomeId: HOME_A,
    schedule: {
      pattern_type: 'alternate_weeks',
      anchor_date: '2026-06-01',
      week_a_home_id: HOME_A,
      week_b_home_id: HOME_B,
      configuration: { home_a: HOME_A, home_b: HOME_B },
    },
    homesById: {
      [HOME_A]: { id: HOME_A, label: 'A', color: '#22C55E' },
      [HOME_B]: { id: HOME_B, label: 'B', color: '#4F46E5' },
    },
    overrides: [],
  };
}

describe('custody-override-config', () => {
  it('isIsoDate validates YYYY-MM-DD', () => {
    assert.equal(isIsoDate('2026-06-01'), true);
    assert.equal(isIsoDate('06-01-2026'), false);
  });

  it('validateOverrideInput rejects invalid range and home', () => {
    const homes = new Set([HOME_A, HOME_B]);
    const badRange = validateOverrideInput({
      start_date: '2026-06-10',
      end_date: '2026-06-01',
      home_id: HOME_A,
    }, homes);
    assert.equal(badRange.ok, false);

    const badHome = validateOverrideInput({
      start_date: '2026-06-01',
      end_date: '2026-06-05',
      home_id: 'bad',
    }, homes);
    assert.equal(badHome.ok, false);

    const ok = validateOverrideInput({
      start_date: '2026-06-01',
      end_date: '2026-06-05',
      home_id: HOME_B,
      reason: 'Sportlov',
    }, homes);
    assert.equal(ok.ok, true);
    assert.equal(ok.row.home_id, HOME_B);
    assert.equal(ok.row.reason, 'Sportlov');
  });
});

describe('custody override engine (FEAT-1C)', () => {
  it('findOverrideForDate picks highest priority on overlap', () => {
    const overrides = [
      { start_date: '2026-06-01', end_date: '2026-06-07', home_id: HOME_B, priority: 0 },
      { start_date: '2026-06-03', end_date: '2026-06-04', home_id: HOME_A, priority: 2 },
    ];
    const hit = findOverrideForDate(overrides, '2026-06-03');
    assert.equal(hit.home_id, HOME_A);
  });

  it('resolveCustodyDateSync uses DB-shaped override over alternate_weeks', () => {
    const ctx = weeksCtx();
    ctx.overrides = [{
      start_date: '2026-06-02',
      end_date: '2026-06-04',
      home_id: HOME_B,
      priority: 0,
    }];
    const result = resolveCustodyDateSync(ctx, '2026-06-03');
    assert.equal(result.source, 'override');
    assert.equal(result.activeHome.id, HOME_B);
    assert.equal(result.activePeriod.start, '2026-06-02');
    assert.equal(result.activePeriod.end, '2026-06-04');
  });

  it('loadCustodyContext loads overrides from custody db', () => {
    const engine = fs.readFileSync(
      path.join(ROOT, 'src/lib/custody-schedule-engine/index.js'),
      'utf8'
    );
    assert.match(engine, /listOverridesForChild/);
    assert.doesNotMatch(engine, /overrides: \[\]/);
  });

  it('custody routes expose override CRUD', () => {
    const routes = fs.readFileSync(path.join(ROOT, 'src/routes/family/custody.js'), 'utf8');
    assert.match(routes, /\/overrides\/:childId/);
    assert.match(routes, /validateOverrideInput/);
    assert.match(routes, /custody_override_created/);
  });

  it('migration creates custody_override table', () => {
    const migration = fs.readFileSync(
      path.join(ROOT, 'migrations/1809330000000_custody_override.js'),
      'utf8'
    );
    assert.match(migration, /custody_override/);
    assert.match(migration, /start_date <= end_date/);
  });
});
