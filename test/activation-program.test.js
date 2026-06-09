'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { DateTime } = require('luxon');
const {
  getCalendarDay,
  getEffectiveProgramDay,
  maybeExpireProgram,
  getExpiryDay,
} = require('../src/lib/activation-program');
const {
  hashToPercent,
  assignCohortArm,
  isPostLaunchEnrollment,
} = require('../src/lib/activation-program-enroll');

function makeProgram(startedAt, overrides = {}) {
  return {
    started_at: startedAt,
    status: 'active',
    program_type: 'onboarding_7d',
    ...overrides,
  };
}

describe('activation-program day logic', () => {
  const origTz = process.env.TZ;

  beforeEach(() => {
    process.env.TZ = 'UTC';
  });

  afterEach(() => {
    process.env.TZ = origTz;
    delete process.env.ACTIVATION_PROGRAM_EXPIRY_DAY;
    delete process.env.ACTIVATION_PROGRAM_LAUNCH_AT;
    delete process.env.ACTIVATION_PROGRAM_TREATMENT_PCT;
    delete process.env.ACTIVATION_PROGRAM_SMOKE_TEST_DAYS;
  });

  it('enroll at 23:30 local time is still day 1', () => {
    const started = DateTime.fromISO('2026-06-01T23:30:00', { zone: 'Europe/Stockholm' }).toJSDate();
    const program = makeProgram(started);
    const fakeNow = DateTime.fromISO('2026-06-01T23:45:00', { zone: 'Europe/Stockholm' });
    const origNow = DateTime.now;
    DateTime.now = () => fakeNow;
    try {
      assert.equal(getCalendarDay(program, 'Europe/Stockholm'), 1);
      assert.equal(getEffectiveProgramDay(program, 'Europe/Stockholm'), 1);
    } finally {
      DateTime.now = origNow;
    }
  });

  it('midnight rollover uses family timezone not UTC', () => {
    const started = DateTime.fromISO('2026-06-01T10:00:00Z', { zone: 'utc' }).toJSDate();
    const program = makeProgram(started);
    const fakeNow = DateTime.fromISO('2026-06-02T00:30:00Z', { zone: 'utc' });
    const origNow = DateTime.now;
    DateTime.now = () => fakeNow;
    try {
      assert.equal(getCalendarDay(program, 'Europe/Stockholm'), 2);
    } finally {
      DateTime.now = origNow;
    }
  });

  it('DST spring forward — luxon handles March transition', () => {
    const started = DateTime.fromISO('2026-03-29T00:00:00', { zone: 'Europe/Stockholm' }).toJSDate();
    const program = makeProgram(started);
    const fakeNow = DateTime.fromISO('2026-03-30T12:00:00', { zone: 'Europe/Stockholm' });
    const origNow = DateTime.now;
    DateTime.now = () => fakeNow;
    try {
      assert.equal(getCalendarDay(program, 'Europe/Stockholm'), 2);
    } finally {
      DateTime.now = origNow;
    }
  });

  it('DST fall back — luxon handles October transition', () => {
    const started = DateTime.fromISO('2026-10-25T00:00:00', { zone: 'Europe/Stockholm' }).toJSDate();
    const program = makeProgram(started);
    const fakeNow = DateTime.fromISO('2026-10-26T12:00:00', { zone: 'Europe/Stockholm' });
    const origNow = DateTime.now;
    DateTime.now = () => fakeNow;
    try {
      assert.equal(getCalendarDay(program, 'Europe/Stockholm'), 2);
    } finally {
      DateTime.now = origNow;
    }
  });

  it('maybeExpireProgram sets expired when calendar_day > 21', () => {
    process.env.ACTIVATION_PROGRAM_EXPIRY_DAY = '21';
    const started = DateTime.fromISO('2026-01-01T00:00:00', { zone: 'Europe/Stockholm' }).toJSDate();
    const program = makeProgram(started);
    const fakeNow = DateTime.fromISO('2026-01-23T12:00:00', { zone: 'Europe/Stockholm' });
    const origNow = DateTime.now;
    DateTime.now = () => fakeNow;
    try {
      const result = maybeExpireProgram(program, 'Europe/Stockholm');
      assert.equal(result.status, 'expired');
      assert.equal(getCalendarDay(program, 'Europe/Stockholm'), 23);
    } finally {
      DateTime.now = origNow;
    }
  });

  it('effective_day caps at 7 while calendar_day continues', () => {
    const started = DateTime.fromISO('2026-01-01T00:00:00', { zone: 'Europe/Stockholm' }).toJSDate();
    const program = makeProgram(started);
    const fakeNow = DateTime.fromISO('2026-01-11T12:00:00', { zone: 'Europe/Stockholm' });
    const origNow = DateTime.now;
    DateTime.now = () => fakeNow;
    try {
      assert.equal(getCalendarDay(program, 'Europe/Stockholm'), 11);
      assert.equal(getEffectiveProgramDay(program, 'Europe/Stockholm'), 7);
    } finally {
      DateTime.now = origNow;
    }
  });

  it('getExpiryDay defaults to 21', () => {
    assert.equal(getExpiryDay(), 21);
  });
});

describe('activation-program-enroll', () => {
  afterEach(() => {
    delete process.env.ACTIVATION_PROGRAM_LAUNCH_AT;
    delete process.env.ACTIVATION_PROGRAM_TREATMENT_PCT;
    delete process.env.ACTIVATION_PROGRAM_SMOKE_TEST_DAYS;
  });

  it('hashToPercent is deterministic 0-99', () => {
    const a = hashToPercent('11111111-1111-1111-1111-111111111111');
    const b = hashToPercent('11111111-1111-1111-1111-111111111111');
    assert.equal(a, b);
    assert.ok(a >= 0 && a < 100);
  });

  it('assignCohortArm is deterministic per family', () => {
    const id = '22222222-2222-2222-2222-222222222222';
    process.env.ACTIVATION_PROGRAM_LAUNCH_AT = '2020-01-01T00:00:00Z';
    process.env.ACTIVATION_PROGRAM_SMOKE_TEST_DAYS = '0';
    process.env.ACTIVATION_PROGRAM_TREATMENT_PCT = '50';
    assert.equal(assignCohortArm(id), assignCohortArm(id));
  });

  it('isPostLaunchEnrollment false without LAUNCH_AT', () => {
    delete process.env.ACTIVATION_PROGRAM_LAUNCH_AT;
    assert.equal(isPostLaunchEnrollment(), false);
  });

  it('isPostLaunchEnrollment true after LAUNCH_AT', () => {
    process.env.ACTIVATION_PROGRAM_LAUNCH_AT = '2020-01-01T00:00:00Z';
    assert.equal(isPostLaunchEnrollment(), true);
  });
});
