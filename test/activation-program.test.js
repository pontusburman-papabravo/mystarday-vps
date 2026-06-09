'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { DateTime } = require('luxon');

const {
  getCalendarDay,
  getEffectiveProgramDay,
  maybeExpireProgram,
  shouldShowBanner,
  isControlArm,
} = require('../src/lib/activation-program');

const {
  hashToPercent,
  assignCohortArm,
  isPostLaunchEnrollment,
  canEnrollOnboardingProgram,
} = require('../src/lib/activation-program-enroll');

function programAt(startIso, overrides = {}) {
  return {
    started_at: startIso,
    program_type: 'onboarding_7d',
    status: 'active',
    cohort_arm: 'treatment',
    ...overrides,
  };
}

function withMockedNow(isoUtc, fn) {
  const fixed = DateTime.fromISO(isoUtc, { zone: 'utc' });
  const originalNow = DateTime.now;
  DateTime.now = () => fixed;
  try {
    return fn();
  } finally {
    DateTime.now = originalNow;
  }
}

describe('activation-program day logic', () => {
  it('enroll at 23:30 local time is still day 1', () => {
    withMockedNow('2026-06-01T21:35:00.000Z', () => {
      const program = programAt('2026-06-01T21:30:00.000Z');
      assert.equal(getCalendarDay(program, 'Europe/Stockholm'), 1);
      assert.equal(getEffectiveProgramDay(program, 'Europe/Stockholm'), 1);
    });
  });

  it('midnight rollover uses local timezone, not UTC', () => {
    // 23:30 Stockholm day 1 → 00:05 Stockholm day 2 (= 22:05 UTC same calendar UTC date)
    withMockedNow('2026-06-01T22:05:00.000Z', () => {
      const program = programAt('2026-06-01T21:30:00.000Z');
      assert.equal(getCalendarDay(program, 'Europe/Stockholm'), 2);
    });
  });

  it('DST spring forward — luxon keeps calendar days stable', () => {
    withMockedNow('2026-03-30T10:00:00.000Z', () => {
      const program = programAt('2026-03-29T08:00:00.000Z');
      assert.equal(getCalendarDay(program, 'Europe/Stockholm'), 2);
    });
  });

  it('DST fall back — luxon keeps calendar days stable', () => {
    withMockedNow('2026-10-26T10:00:00.000Z', () => {
      const program = programAt('2026-10-25T08:00:00.000Z');
      assert.equal(getCalendarDay(program, 'Europe/Stockholm'), 2);
    });
  });

  it('calendar_day > 21 expires active programs', () => {
    const originalExpiry = process.env.ACTIVATION_PROGRAM_EXPIRY_DAY;
    process.env.ACTIVATION_PROGRAM_EXPIRY_DAY = '21';

    try {
      withMockedNow('2026-06-23T08:00:00.000Z', () => {
        const program = programAt('2026-06-01T08:00:00.000Z');
        assert.equal(getCalendarDay(program, 'Europe/Stockholm'), 23);
        const expired = maybeExpireProgram(program, 'Europe/Stockholm');
        assert.equal(expired.status, 'expired');
      });
    } finally {
      if (originalExpiry === undefined) delete process.env.ACTIVATION_PROGRAM_EXPIRY_DAY;
      else process.env.ACTIVATION_PROGRAM_EXPIRY_DAY = originalExpiry;
    }
  });

  it('effective_day caps at 7 while calendar_day continues', () => {
    withMockedNow('2026-06-11T08:00:00.000Z', () => {
      const program = programAt('2026-06-01T08:00:00.000Z');
      assert.equal(getCalendarDay(program, 'Europe/Stockholm'), 11);
      assert.equal(getEffectiveProgramDay(program, 'Europe/Stockholm'), 7);
    });
  });

  it('shouldShowBanner enforces active + treatment only', () => {
    assert.equal(shouldShowBanner({ status: 'active', cohort_arm: 'treatment' }), true);
    assert.equal(shouldShowBanner({ status: 'active', cohort_arm: 'control' }), false);
    assert.equal(shouldShowBanner({ status: 'completed', cohort_arm: 'treatment' }), false);
    assert.equal(isControlArm({ cohort_arm: 'control' }), true);
  });
});

describe('activation-program enrollment', () => {
  const envBackup = {};

  beforeEach(() => {
    for (const key of [
      'ACTIVATION_PROGRAM_LAUNCH_AT',
      'ACTIVATION_PROGRAM_TREATMENT_PCT',
      'ACTIVATION_PROGRAM_SMOKE_TEST_DAYS',
      'ACTIVATION_PROGRAM_ENABLED',
    ]) {
      envBackup[key] = process.env[key];
    }
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(envBackup)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('hashToPercent is deterministic 0–99', () => {
    const familyId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    assert.equal(hashToPercent(familyId), hashToPercent(familyId));
    assert.ok(hashToPercent(familyId) >= 0);
    assert.ok(hashToPercent(familyId) < 100);
  });

  it('assignCohortArm is deterministic per family', () => {
    const familyId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    process.env.ACTIVATION_PROGRAM_LAUNCH_AT = '2020-01-01T00:00:00Z';
    process.env.ACTIVATION_PROGRAM_TREATMENT_PCT = '50';
    process.env.ACTIVATION_PROGRAM_SMOKE_TEST_DAYS = '0';

    assert.equal(assignCohortArm(familyId), assignCohortArm(familyId));
  });

  it('smoke period assigns 100% treatment', () => {
    process.env.ACTIVATION_PROGRAM_LAUNCH_AT = DateTime.utc().minus({ days: 1 }).toISO();
    process.env.ACTIVATION_PROGRAM_SMOKE_TEST_DAYS = '3';
    process.env.ACTIVATION_PROGRAM_TREATMENT_PCT = '0';

    const arms = new Set();
    for (let i = 0; i < 20; i += 1) {
      arms.add(assignCohortArm(`family-${i}`));
    }
    assert.deepEqual(arms, new Set(['treatment']));
  });

  it('isPostLaunchEnrollment respects ACTIVATION_PROGRAM_LAUNCH_AT', () => {
    process.env.ACTIVATION_PROGRAM_LAUNCH_AT = '2026-06-02T06:00:00Z';

    assert.equal(
      isPostLaunchEnrollment(DateTime.fromISO('2026-06-01T12:00:00Z', { zone: 'utc' })),
      false
    );
    assert.equal(
      isPostLaunchEnrollment(DateTime.fromISO('2026-06-02T06:00:00Z', { zone: 'utc' })),
      true
    );
  });

  it('canEnrollOnboardingProgram blocks pre-launch and retroactive paths', () => {
    process.env.ACTIVATION_PROGRAM_ENABLED = 'true';
    process.env.ACTIVATION_PROGRAM_LAUNCH_AT = '2026-06-02T06:00:00Z';

    const beforeLaunch = DateTime.fromISO('2026-06-01T12:00:00Z', { zone: 'utc' });
    assert.equal(
      canEnrollOnboardingProgram({
        onboardingJustCompleted: true,
        hasActiveProgram: false,
        now: beforeLaunch,
      }),
      false
    );

    const afterLaunch = DateTime.fromISO('2026-06-03T12:00:00Z', { zone: 'utc' });
    assert.equal(
      canEnrollOnboardingProgram({
        onboardingJustCompleted: true,
        hasActiveProgram: false,
        now: afterLaunch,
      }),
      true
    );

    assert.equal(
      canEnrollOnboardingProgram({
        onboardingJustCompleted: false,
        hasActiveProgram: false,
        now: afterLaunch,
      }),
      false
    );
  });
});
