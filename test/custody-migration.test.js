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
