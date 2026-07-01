'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { weekVariantForHomeId } = require('../src/lib/custody-schedule-resolve');

const ROOT = path.join(__dirname, '..');

const HOME_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const HOME_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const weeksSchedule = {
  pattern_type: 'alternate_weeks',
  week_a_home_id: HOME_A,
  week_b_home_id: HOME_B,
  configuration: { home_a: HOME_A, home_b: HOME_B },
};

describe('custody-schedule-resolve', () => {
  it('uses engine only — no custody-resolver imports', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/lib/custody-schedule-resolve.js'), 'utf8');
    assert.match(src, /resolveCustodyDateSync/);
    assert.match(src, /loadCustodyContext/);
    assert.match(src, /custody_home_id/);
    assert.doesNotMatch(src, /custody-resolver/);
    assert.doesNotMatch(src, /getWeekVariantForDate/);
  });

  it('weekVariantForHomeId maps home ids for alternate_weeks fallback only', () => {
    assert.equal(weekVariantForHomeId(weeksSchedule, HOME_A), 'a');
    assert.equal(weekVariantForHomeId(weeksSchedule, HOME_B), 'b');
    assert.equal(weekVariantForHomeId({ pattern_type: 'alternate_weekends' }, HOME_A), null);
    assert.equal(weekVariantForHomeId(weeksSchedule, null), null);
  });

  it('daily-log-generator still imports resolveWeeklyScheduleId', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/lib/daily-log-generator.js'), 'utf8');
    assert.match(src, /resolveWeeklyScheduleId/);
    assert.doesNotMatch(src, /custody-resolver/);
    assert.doesNotMatch(src, /getWeekVariantForDate/);
  });
});
