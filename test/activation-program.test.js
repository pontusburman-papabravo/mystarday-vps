'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { Settings, DateTime } = require('luxon');
const {
  getCalendarDay,
  getEffectiveProgramDay,
  maybeExpireProgram,
} = require('../src/lib/activation-program');
const {
  hashToPercent,
  isPostLaunchEnrollment,
  assignCohortArm,
} = require('../src/lib/activation-program-enroll');

const TZ = 'Europe/Stockholm';

function mockNow(isoUtc) {
  const fixed = DateTime.fromISO(isoUtc, { zone: 'utc' }).toMillis();
  Settings.now = () => fixed;
}

function restoreNow() {
  Settings.now = () => Date.now();
}

describe('activation-program day logic', () => {
  beforeEach(() => {
    delete process.env.ACTIVATION_PROGRAM_EXPIRY_DAY;
  });

  afterEach(() => {
    restoreNow();
  });

  it('enroll at 23:30 local time is still day 1', () => {
    // Started 2026-06-01 21:30 UTC = 23:30 Stockholm (CEST)
    const program = { started_at: '2026-06-01T21:30:00.000Z', program_type: 'onboarding_7d' };
    mockNow('2026-06-01T21:45:00.000Z'); // 23:45 Stockholm — same local calendar day
    assert.equal(getCalendarDay(program, TZ), 1);
    assert.equal(getEffectiveProgramDay(program, TZ), 1);
  });

  it('midnight rollover uses local timezone, not UTC', () => {
    const program = { started_at: '2026-06-01T10:00:00.000Z', program_type: 'onboarding_7d' };
    // 2026-06-01 23:30 Stockholm = 21:30 UTC — still day 1
    mockNow('2026-06-01T21:30:00.000Z');
    assert.equal(getCalendarDay(program, TZ), 1);

    // 2026-06-02 00:30 Stockholm = 2026-06-01 22:30 UTC — day 2 locally
    mockNow('2026-06-01T22:30:00.000Z');
    assert.equal(getCalendarDay(program, TZ), 2);
  });

  it('DST spring forward (March) — day boundary stays correct', () => {
    // 2026-03-29: clocks spring forward 02:00 → 03:00 in Stockholm
    const program = { started_at: '2026-03-28T12:00:00.000Z', program_type: 'onboarding_7d' };
    mockNow('2026-03-29T12:00:00.000Z'); // noon UTC on DST day
    assert.equal(getCalendarDay(program, TZ), 2);
  });

  it('DST fall back (October) — day boundary stays correct', () => {
    // 2026-10-25: clocks fall back 03:00 → 02:00 in Stockholm
    const program = { started_at: '2026-10-24T12:00:00.000Z', program_type: 'onboarding_7d' };
    mockNow('2026-10-25T12:00:00.000Z');
    assert.equal(getCalendarDay(program, TZ), 2);
  });

  it('maybeExpireProgram sets expired when calendar_day > 21', () => {
    process.env.ACTIVATION_PROGRAM_EXPIRY_DAY = '21';
    const program = {
      started_at: '2026-01-01T00:00:00.000Z',
      program_type: 'onboarding_7d',
      status: 'active',
    };
    mockNow('2026-01-22T12:00:00.000Z'); // day 22
    const result = maybeExpireProgram(program, TZ);
    assert.equal(result.status, 'expired');
  });

  it('maybeExpireProgram leaves active program on day 21', () => {
    process.env.ACTIVATION_PROGRAM_EXPIRY_DAY = '21';
    const program = {
      started_at: '2026-01-01T00:00:00.000Z',
      program_type: 'onboarding_7d',
      status: 'active',
    };
    mockNow('2026-01-21T12:00:00.000Z');
    const result = maybeExpireProgram(program, TZ);
    assert.equal(result.status, 'active');
  });

  it('effective_day caps at 7 while calendar_day continues', () => {
    const program = {
      started_at: '2026-01-01T00:00:00.000Z',
      program_type: 'onboarding_7d',
    };
    mockNow('2026-01-10T12:00:00.000Z');
    assert.equal(getCalendarDay(program, TZ), 10);
    assert.equal(getEffectiveProgramDay(program, TZ), 7);
  });

  it('effective_day caps at 3 for reactivation_3d', () => {
    const program = {
      started_at: '2026-01-01T00:00:00.000Z',
      program_type: 'reactivation_3d',
    };
    mockNow('2026-01-05T12:00:00.000Z');
    assert.equal(getCalendarDay(program, TZ), 5);
    assert.equal(getEffectiveProgramDay(program, TZ), 3);
  });
});

describe('activation-program-enroll', () => {
  const familyId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  beforeEach(() => {
    delete process.env.ACTIVATION_PROGRAM_LAUNCH_AT;
    delete process.env.ACTIVATION_PROGRAM_TREATMENT_PCT;
    delete process.env.ACTIVATION_PROGRAM_SMOKE_TEST_DAYS;
  });

  it('hashToPercent is deterministic 0–99', () => {
    const a = hashToPercent(familyId);
    const b = hashToPercent(familyId);
    assert.equal(a, b);
    assert.ok(a >= 0 && a < 100);
  });

  it('isPostLaunchEnrollment is false without LAUNCH_AT', () => {
    assert.equal(isPostLaunchEnrollment(), false);
  });

  it('isPostLaunchEnrollment respects launch timestamp', () => {
    process.env.ACTIVATION_PROGRAM_LAUNCH_AT = '2026-06-02T06:00:00Z';
    const before = DateTime.fromISO('2026-06-02T05:59:59Z', { zone: 'utc' });
    const after = DateTime.fromISO('2026-06-02T06:00:00Z', { zone: 'utc' });
    assert.equal(isPostLaunchEnrollment(before), false);
    assert.equal(isPostLaunchEnrollment(after), true);
  });

  it('assignCohortArm uses 100% treatment during smoke period', () => {
    process.env.ACTIVATION_PROGRAM_LAUNCH_AT = '2026-06-02T06:00:00Z';
    process.env.ACTIVATION_PROGRAM_SMOKE_TEST_DAYS = '3';
    process.env.ACTIVATION_PROGRAM_TREATMENT_PCT = '50';
    const day1 = DateTime.fromISO('2026-06-02T12:00:00Z', { zone: 'utc' });
    assert.equal(assignCohortArm(familyId, day1), 'treatment');
  });

  it('assignCohortArm uses treatment pct after smoke period', () => {
    process.env.ACTIVATION_PROGRAM_LAUNCH_AT = '2026-06-02T06:00:00Z';
    process.env.ACTIVATION_PROGRAM_SMOKE_TEST_DAYS = '3';
    process.env.ACTIVATION_PROGRAM_TREATMENT_PCT = '0';
    const day5 = DateTime.fromISO('2026-06-07T12:00:00Z', { zone: 'utc' });
    assert.equal(assignCohortArm(familyId, day5), 'control');
  });
});
