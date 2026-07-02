'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  buildAlternateWeeksConfiguration,
  resolveScheduleFields,
  PATTERN_ALTERNATE_WEEKS,
} = require('../db/custody');

const ROOT = path.join(__dirname, '..');

describe('custody schedule domain migration (Phase 2)', () => {
  it('migration adds pattern_type, configuration and home icon', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'migrations/1808970000000_custody_schedule_domain.js'),
      'utf8'
    );
    assert.match(src, /pattern_type/);
    assert.match(src, /configuration/);
    assert.match(src, /icon VARCHAR/);
    assert.match(src, /alternate_weeks/);
    assert.match(src, /home_a/);
    assert.match(src, /home_b/);
  });

  it('resolveScheduleFields builds alternate_weeks configuration from legacy homes', () => {
    const homeA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const homeB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const { patternType, configuration } = resolveScheduleFields({
      week_a_home_id: homeA,
      week_b_home_id: homeB,
    });
    assert.equal(patternType, PATTERN_ALTERNATE_WEEKS);
    assert.equal(configuration.home_a, homeA);
    assert.equal(configuration.home_b, homeB);
  });

  it('buildAlternateWeeksConfiguration matches spec JSON shape', () => {
    const homeA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const homeB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    assert.deepEqual(
      buildAlternateWeeksConfiguration(homeA, homeB),
      { home_a: homeA, home_b: homeB }
    );
  });

  it('db/custody exports schedule aliases', () => {
    const src = fs.readFileSync(path.join(ROOT, 'db/custody.js'), 'utf8');
    assert.match(src, /getSchedule/);
    assert.match(src, /upsertSchedule/);
    assert.match(src, /pattern_type/);
    assert.match(src, /configuration/);
  });
});

describe('custody weekly_schedule home backfill (Phase 5)', () => {
  it('migration backfills custody_home_id from pattern configuration', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'migrations/1809210000000_custody_weekly_schedule_home_backfill.js'),
      'utf8'
    );
    assert.match(src, /backfillWeeklyScheduleHomeIds/);
    assert.match(src, /custody_weekly_schedule_home_backfill/);
  });

  it('custody-schedule-migrate backfill maps week_variant a/b via configuration', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'src/lib/custody-schedule-migrate.js'),
      'utf8'
    );
    assert.match(src, /configuration->>'home_a'/);
    assert.match(src, /configuration->>'home_b'/);
    assert.match(src, /weekend_home_a/);
    assert.match(src, /week_variant IS NOT NULL/);
  });

  it('resolveScheduleWriteFields prefers custody_home_id and syncs week_variant', () => {
    const {
      resolveScheduleWriteFields,
      variantForHomeId,
      homeIdForVariant,
    } = require('../src/lib/custody-schedule-write');

    const homeA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const homeB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const pattern = {
      week_a_home_id: homeA,
      week_b_home_id: homeB,
      pattern_type: 'alternate_weeks',
      configuration: { home_a: homeA, home_b: homeB },
    };

    assert.equal(variantForHomeId(pattern, homeA), 'a');
    assert.equal(variantForHomeId(pattern, homeB), 'b');
    assert.equal(homeIdForVariant(pattern, 'a'), homeA);
    assert.equal(homeIdForVariant(pattern, 'b'), homeB);

    const fromHome = resolveScheduleWriteFields(pattern, { custody_home_id: homeB });
    assert.equal(fromHome.weekVariant, 'b');
    assert.equal(fromHome.custodyHomeId, homeB);

    const fromVariant = resolveScheduleWriteFields(pattern, { week_variant: 'a' });
    assert.equal(fromVariant.weekVariant, 'a');
    assert.equal(fromVariant.custodyHomeId, homeA);

    const mismatch = resolveScheduleWriteFields(pattern, {
      week_variant: 'a',
      custody_home_id: homeB,
    });
    assert.match(mismatch.error, /matchar inte/);
  });

  it('child-crud accepts custody_home_id on create path', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'src/routes/schedules/child-crud.js'),
      'utf8'
    );
    assert.match(src, /resolveScheduleWriteFields/);
    assert.match(src, /CreateChildScheduleSchema/);
    assert.match(src, /custody_home_id/);
    assert.match(src, /RETURNING id, child_id, day_of_week, sort_order, week_variant, custody_home_id/);
  });
});
