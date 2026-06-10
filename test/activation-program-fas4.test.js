'use strict';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/test';

const fs = require('fs');
const path = require('path');
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { DateTime } = require('luxon');

const {
  assignCohortArmAtLaunch,
  getCohortArmForEnroll,
  normalizeEnrollChoice,
  normalizeEnrollSource,
  isActivationEmailEnabled,
  isActivationProgramEnabled,
} = require('../src/lib/activation-program-enroll');

describe('Fas 4 — enrollment (föräldraval)', () => {
  const envBackup = {};

  beforeEach(() => {
    envBackup.ACTIVATION_PROGRAM_ENABLED = process.env.ACTIVATION_PROGRAM_ENABLED;
    envBackup.ACTIVATION_PROGRAM_AB_ENABLED = process.env.ACTIVATION_PROGRAM_AB_ENABLED;
    envBackup.ACTIVATION_PROGRAM_EMAIL_ENABLED = process.env.ACTIVATION_PROGRAM_EMAIL_ENABLED;
  });

  afterEach(() => {
    for (const [key, val] of Object.entries(envBackup)) {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
  });

  it('assignCohortArmAtLaunch returns treatment when AB disabled', () => {
    delete process.env.ACTIVATION_PROGRAM_AB_ENABLED;
    assert.equal(assignCohortArmAtLaunch(), 'treatment');
  });

  it('getCohortArmForEnroll uses treatment at launch', () => {
    delete process.env.ACTIVATION_PROGRAM_AB_ENABLED;
    assert.equal(getCohortArmForEnroll('family-uuid'), 'treatment');
  });

  it('normalizes enroll choice and source', () => {
    assert.equal(normalizeEnrollChoice('guided'), 'guided');
    assert.equal(normalizeEnrollChoice('direct'), 'direct');
    assert.equal(normalizeEnrollChoice('invalid'), null);
    assert.equal(normalizeEnrollSource('onboarding_complete'), 'onboarding_complete');
    assert.equal(normalizeEnrollSource('email_reactivation'), 'email_reactivation');
    assert.equal(normalizeEnrollSource('auto'), null);
  });

  it('email flag requires both ENABLED and EMAIL_ENABLED', () => {
    delete process.env.ACTIVATION_PROGRAM_ENABLED;
    delete process.env.ACTIVATION_PROGRAM_EMAIL_ENABLED;
    assert.equal(isActivationProgramEnabled(), false);
    assert.equal(isActivationEmailEnabled(), false);

    process.env.ACTIVATION_PROGRAM_ENABLED = 'true';
    assert.equal(isActivationEmailEnabled(), false);

    process.env.ACTIVATION_PROGRAM_EMAIL_ENABLED = 'true';
    assert.equal(isActivationEmailEnabled(), true);
  });
});

describe('Fas 4 — routes and assets', () => {
  it('registers enroll-choice endpoints', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/routes/activation-program.js'),
      'utf8'
    );
    assert.ok(src.includes("router.get('/enroll-choice'"));
    assert.ok(src.includes("router.post('/enroll-choice'"));
    assert.ok(src.includes('Ja, hjälp oss första veckan'));
    assert.ok(src.includes('Vi kör själva'));
  });

  it('public invite click route redirects to activation-enroll', () => {
    const src = fs.readFileSync(path.join(__dirname, '../src/routes/public.js'), 'utf8');
    assert.ok(src.includes('/public/activation-program/invite/:token'));
    assert.ok(src.includes('activation-enroll.html'));
  });

  it('onboarding defers to enroll choice before dashboard', () => {
    const js = fs.readFileSync(path.join(__dirname, '../public/js/onboarding.js'), 'utf8');
    assert.ok(js.includes('ActivationProgramEnrollChoice.maybeShowAfterOnboarding'));
    assert.equal(js.includes('assignCohortArm'), false);
  });

  it('onboarding complete does not auto-enroll', () => {
    const src = fs.readFileSync(path.join(__dirname, '../src/routes/onboarding.js'), 'utf8');
    assert.equal(src.includes('activation-program-enroll'), false);
    assert.equal(src.includes('parent_activation_program'), false);
  });
});

describe('Fas 4 — launch cutoff', () => {
  it('isPostLaunchEnrollment respects LAUNCH_AT', () => {
    const { isPostLaunchEnrollment } = require('../src/lib/activation-program-enroll');
    const launch = '2026-06-01T00:00:00.000Z';
    process.env.ACTIVATION_PROGRAM_LAUNCH_AT = launch;

    const before = DateTime.fromISO('2026-05-31T23:59:00.000Z', { zone: 'utc' });
    const after = DateTime.fromISO('2026-06-01T00:00:01.000Z', { zone: 'utc' });

    assert.equal(isPostLaunchEnrollment(before), false);
    assert.equal(isPostLaunchEnrollment(after), true);
  });
});
