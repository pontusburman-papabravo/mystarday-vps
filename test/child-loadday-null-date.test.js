'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { parseLogDate } = require('../src/routes/daily-logs/helpers');

const ROOT = path.join(__dirname, '..');

describe('child loadDay date=null race', () => {
  it('parseLogDate treats literal null/undefined query strings as today', () => {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' });
    assert.equal(parseLogDate('null'), today);
    assert.equal(parseLogDate('undefined'), today);
    assert.equal(parseLogDate(null), today);
    assert.equal(parseLogDate(''), today);
  });

  it('parseLogDate still accepts YYYY-MM-DD', () => {
    assert.equal(parseLogDate('2026-06-24'), '2026-06-24');
    assert.equal(parseLogDate('2026-06-24T10:00:00Z'), '2026-06-24');
  });

  it('loadDay normalizes null and waits for me before fetching', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard-load-day.js'), 'utf8');
    assert.match(src, /if \(!dateStr \|\| dateStr === 'null'/);
    assert.match(src, /if \(!me\) return;/);
  });

  it('_refreshLoadDay falls back to todayStr/getLocalDate', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard-load-day.js'), 'utf8');
    assert.match(src, /const dateStr = currentDate \|\| todayStr \|\| getLocalDate\(\)/);
  });

  it('resolveChildScheduleDate stays on host', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard.js'), 'utf8');
    assert.match(src, /window\.resolveChildScheduleDate = resolveChildScheduleDate/);
  });

  it('child-activity-engine uses resolveChildScheduleDate fallback', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-activity-engine.js'), 'utf8');
    assert.match(src, /resolveChildScheduleDate/);
  });
});
