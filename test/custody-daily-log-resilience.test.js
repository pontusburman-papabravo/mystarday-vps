'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('custody-schedule-resolve resilience', () => {
  it('falls back to legacy schedule when engine resolve fails', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/lib/custody-schedule-resolve.js'), 'utf8');
    assert.match(src, /resolveWeeklyScheduleId failed/);
    assert.match(src, /week_variant IS NULL/);
    assert.match(src, /resolveCustodyDateSync/);
  });

  it('daily-log uses explicit ISO dates for API calls', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/daily-log.js'), 'utf8');
    assert.match(src, /function toIsoDate/);
    assert.match(src, /encodeURIComponent\(dateParam\)/);
    assert.match(src, /window\.loadLog = loadLog/);
  });
});

describe('schedule-date-utils', () => {
  const { getDayOfWeek } = require('../src/lib/schedule-date-utils');

  it('getDayOfWeek returns Thursday=4 for 2026-06-04 Stockholm', () => {
    assert.equal(getDayOfWeek('2026-06-04', 'Europe/Stockholm'), 4);
  });
});
