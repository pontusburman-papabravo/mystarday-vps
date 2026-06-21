'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  msUntilNextSunday2100Stockholm,
} = require('../src/lib/weekly-summary-scheduler');

describe('weekly summary scheduler', () => {
  it('uses a dedicated DB client for advisory locks', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/lib/weekly-summary-scheduler.js'),
      'utf8'
    );
    assert.ok(src.includes('db.getClient()'), 'must acquire advisory lock on a dedicated connection');
    assert.ok(src.includes('weekly_summary_send_log'), 'must dedupe sends per parent/week');
    assert.ok(src.includes("apiKeyProfile: 'weekly'"), 'must use dedicated weekly Resend key profile');
    assert.ok(src.includes('stockholm-time'), 'must use timezone-safe Stockholm conversion');
    assert.ok(!src.includes('Fail-open'), 'must not fail open on lock errors');
  });

  it('waits until 21:00 Stockholm when the server starts at 19:00 Stockholm', () => {
    const sunday1900Stockholm = new Date('2026-06-21T17:00:00.000Z'); // 19:00 CEST
    const ms = msUntilNextSunday2100Stockholm({ afterRun: false, now: sunday1900Stockholm });
    assert.ok(Math.abs(ms - 2 * 60 * 60 * 1000) < 2000, `expected ~2h wait, got ${ms}ms`);
  });

  it('schedules at least one week ahead after a Sunday 21:00 run', () => {
    const sunday2105 = new Date('2026-06-21T19:05:00.000Z'); // 21:05 Stockholm (CEST)
    const ms = msUntilNextSunday2100Stockholm({ afterRun: true, now: sunday2105 });
    assert.ok(ms >= 6 * 24 * 60 * 60 * 1000, `expected ~7 days, got ${ms}ms`);
  });

  it('does not loop with zero delay after the 21:00 slot has passed', () => {
    const sunday2130 = new Date('2026-06-21T19:30:00.000Z'); // 21:30 Stockholm (CEST)
    const ms = msUntilNextSunday2100Stockholm({ afterRun: true, now: sunday2130 });
    assert.ok(ms >= 60 * 1000, `expected non-zero reschedule delay, got ${ms}ms`);
  });

  it('fires immediately when the server starts exactly at 21:00 Stockholm', () => {
    const sunday2100 = new Date('2026-06-21T19:00:00.000Z'); // 21:00 Stockholm (CEST)
    const ms = msUntilNextSunday2100Stockholm({ afterRun: false, now: sunday2100 });
    assert.equal(ms, 0);
  });
});
