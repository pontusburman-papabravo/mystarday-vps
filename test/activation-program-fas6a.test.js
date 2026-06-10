'use strict';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/test';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { DateTime } = require('luxon');
const fs = require('fs');
const path = require('path');

const {
  RETENTION_WINDOWS,
  getRetentionWindowBounds,
  isFamilyRetainedFromEvents,
  isParentRetainedFromEvents,
  isFamilyRetained,
  isParentRetained,
  isRetentionWindowMature,
  isExperimentPromising,
} = require('../src/lib/activation-program-retention');

const TZ = 'Europe/Stockholm';

function program(startedAt) {
  return {
    started_at: startedAt,
    family_timezone: TZ,
    program_type: 'onboarding_7d',
  };
}

function event(type, localIsoDate) {
  const at = DateTime.fromISO(localIsoDate, { zone: TZ }).plus({ hours: 10 }).toUTC().toISO();
  return { type, at };
}

describe('Fas 6A — retention windows (FROZEN)', () => {
  it('exposes windows 14, 30, 60', () => {
    assert.deepEqual(RETENTION_WINDOWS, [14, 30, 60]);
  });

  it('Day 14 window = calendar days 13–15', () => {
    const bounds = getRetentionWindowBounds(
      program('2026-06-01T08:00:00.000Z'),
      14,
      TZ
    );
    assert.equal(bounds.fromCalendarDay, 13);
    assert.equal(bounds.toCalendarDay, 15);
    assert.equal(bounds.from.toISODate(), '2026-06-13');
    assert.equal(bounds.to.toISODate(), '2026-06-15');
  });

  it('Day 30 window = days 29–31', () => {
    const bounds = getRetentionWindowBounds(program('2026-01-01T12:00:00.000Z'), 30, TZ);
    assert.equal(bounds.from.toISODate(), '2026-01-29');
    assert.equal(bounds.to.toISODate(), '2026-01-31');
  });

  it('Day 60 window = days 59–61', () => {
    const bounds = getRetentionWindowBounds(program('2026-03-01T12:00:00.000Z'), 60, TZ);
    assert.equal(bounds.fromCalendarDay, 59);
    assert.equal(bounds.toCalendarDay, 61);
    assert.equal(bounds.from.toISODate(), '2026-04-28');
    assert.equal(bounds.to.toISODate(), '2026-04-30');
  });
});

describe('Fas 6A — Family Day 14 North Star', () => {
  const p = program('2026-06-01T08:00:00.000Z');
  const bounds = getRetentionWindowBounds(p, 14, TZ);

  it('parent_login on day 14 → family retained', () => {
    const events = [event('parent_login', '2026-06-14')];
    assert.equal(isFamilyRetainedFromEvents(events, bounds), true);
    assert.equal(isParentRetainedFromEvents(events, bounds), true);
  });

  it('child_completion on day 13 → family retained, parent not', () => {
    const events = [event('child_completion', '2026-06-13')];
    assert.equal(isFamilyRetainedFromEvents(events, bounds), true);
    assert.equal(isParentRetainedFromEvents(events, bounds), false);
  });

  it('event on day 12 → not retained', () => {
    const events = [event('parent_login', '2026-06-12')];
    assert.equal(isFamilyRetainedFromEvents(events, bounds), false);
  });

  it('event on day 16 → not retained', () => {
    const events = [event('child_completion', '2026-06-16')];
    assert.equal(isFamilyRetainedFromEvents(events, bounds), false);
  });

  it('day 15 boundary inclusive', () => {
    const events = [event('parent_login', '2026-06-15')];
    assert.equal(isFamilyRetainedFromEvents(events, bounds), true);
  });

  it('wrapper isFamilyRetained matches events', () => {
    const events = [event('parent_login', '2026-06-14')];
    assert.equal(isFamilyRetained(p, events, 14, TZ), true);
    assert.equal(isParentRetained(p, events, 14, TZ), true);
  });
});

describe('Fas 6A — window maturity', () => {
  const p = program('2026-06-01T08:00:00.000Z');

  it('not mature before end of day 15', () => {
    const now = DateTime.fromISO('2026-06-15T20:00:00', { zone: TZ });
    assert.equal(isRetentionWindowMature(p, 14, TZ, now), false);
  });

  it('mature after day 15', () => {
    const now = DateTime.fromISO('2026-06-16T00:01:00', { zone: TZ });
    assert.equal(isRetentionWindowMature(p, 14, TZ, now), true);
  });
});

describe('Fas 6A — isExperimentPromising (FROZEN v3.9)', () => {
  it('+10 pp absolute lift', () => {
    assert.equal(isExperimentPromising(0.24, 0.34), true);
    assert.equal(isExperimentPromising(0.24, 0.28), false);
  });

  it('+20 % relative lift', () => {
    assert.equal(isExperimentPromising(0.24, 0.29), true);
    assert.equal(isExperimentPromising(0.24, 0.28), false);
  });

  it('control 0 — absolute lift still applies', () => {
    assert.equal(isExperimentPromising(0, 0.1), true);
    assert.equal(isExperimentPromising(0, 0.05), false);
  });
});

describe('Fas 6A — module wiring', () => {
  it('retention engine file exists', () => {
    assert.ok(fs.existsSync(path.join(__dirname, '../src/lib/activation-program-retention.js')));
    assert.ok(fs.existsSync(path.join(__dirname, '../db/activation-program-retention.js')));
  });

  it('exports computeCohortRetention for Fas 6B', () => {
    const mod = require('../src/lib/activation-program-retention');
    assert.equal(typeof mod.computeCohortRetention, 'function');
    assert.equal(typeof mod.evaluateProgramRetention, 'function');
  });
});
