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
  const envBackup = {};

  beforeEach(() => {
    envBackup.ACTIVATION_PROGRAM_ENABLED = process.env.ACTIVATION_PROGRAM_ENABLED;
    envBackup.ACTIVATION_PROGRAM_LAUNCH_AT = process.env.ACTIVATION_PROGRAM_LAUNCH_AT;
  });

  afterEach(() => {
    for (const [key, val] of Object.entries(envBackup)) {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
  });

  it('isPostLaunchEnrollment respects LAUNCH_AT', () => {
    const { isPostLaunchEnrollment } = require('../src/lib/activation-program-enroll');
    const launch = '2026-06-01T00:00:00.000Z';
    process.env.ACTIVATION_PROGRAM_LAUNCH_AT = launch;

    const before = DateTime.fromISO('2026-05-31T23:59:00.000Z', { zone: 'utc' });
    const after = DateTime.fromISO('2026-06-01T00:00:01.000Z', { zone: 'utc' });

    assert.equal(isPostLaunchEnrollment(before), false);
    assert.equal(isPostLaunchEnrollment(after), true);
  });

  it('isProgramFeatureLive requires ENABLED and post-launch (dubbel grind)', () => {
    const { isProgramFeatureLive } = require('../src/lib/activation-program-eligibility');
    const afterLaunch = DateTime.fromISO('2026-06-02T00:00:00.000Z', { zone: 'utc' });

    delete process.env.ACTIVATION_PROGRAM_ENABLED;
    process.env.ACTIVATION_PROGRAM_LAUNCH_AT = '2026-06-01T00:00:00.000Z';
    assert.equal(isProgramFeatureLive(afterLaunch), false);

    process.env.ACTIVATION_PROGRAM_ENABLED = 'true';
    assert.equal(isProgramFeatureLive(afterLaunch), true);

    const beforeLaunch = DateTime.fromISO('2026-05-01T00:00:00.000Z', { zone: 'utc' });
    assert.equal(isProgramFeatureLive(beforeLaunch), false);
  });
});

describe('Fas 4 — eligibility (mocked DB)', () => {
  const envBackup = {};

  beforeEach(() => {
    envBackup.ACTIVATION_PROGRAM_ENABLED = process.env.ACTIVATION_PROGRAM_ENABLED;
    envBackup.ACTIVATION_PROGRAM_LAUNCH_AT = process.env.ACTIVATION_PROGRAM_LAUNCH_AT;
    process.env.ACTIVATION_PROGRAM_ENABLED = 'true';
    process.env.ACTIVATION_PROGRAM_LAUNCH_AT = '2020-01-01T00:00:00.000Z';
  });

  afterEach(() => {
    for (const [key, val] of Object.entries(envBackup)) {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
  });

  it('canShowOnboardingEnrollChoice when schema exists and no prior decision', async () => {
    const dbPath = require.resolve('../src/lib/db');
    const programDbPath = require.resolve('../db/parent-activation-program');
    const eligPath = require.resolve('../src/lib/activation-program-eligibility');

    const mockDb = {
      query: async (sql) => {
        if (sql.includes('weekly_schedule')) return { rows: [{ '?': 1 }] };
        if (sql.includes('analytics_events')) return { rows: [] };
        return { rows: [] };
      },
    };

    require.cache[dbPath] = {
      id: dbPath, filename: dbPath, loaded: true, exports: mockDb, children: [], parent: null, paths: [],
    };
    require.cache[programDbPath] = {
      id: programDbPath, filename: programDbPath, loaded: true,
      exports: {
        getActiveByFamily: async () => null,
        getByFamily: async () => null,
      },
      children: [], parent: null, paths: [],
    };
    delete require.cache[eligPath];
    const { canShowOnboardingEnrollChoice } = require(eligPath);

    const show = await canShowOnboardingEnrollChoice({
      familyId: 'fam-1',
      onboardingCompleted: true,
    });
    assert.equal(show, true);
  });

  it('isEligibleForActivationEmail rejects recent parent login (<7d)', async () => {
    const dbPath = require.resolve('../src/lib/db');
    const programDbPath = require.resolve('../db/parent-activation-program');
    const eligPath = require.resolve('../src/lib/activation-program-eligibility');

    const mockDb = {
      query: async (sql) => {
        if (sql.includes('FROM parent p')) {
          return { rows: [{ id: 'p1', onboarding_completed: true, verified: true, is_admin: false }] };
        }
        if (sql.includes('weekly_schedule')) return { rows: [{ '?': 1 }] };
        if (sql.includes('login_event')) return { rows: [{ '?': 1 }] };
        if (sql.includes('analytics_events')) return { rows: [] };
        return { rows: [] };
      },
    };

    require.cache[dbPath] = {
      id: dbPath, filename: dbPath, loaded: true, exports: mockDb, children: [], parent: null, paths: [],
    };
    require.cache[programDbPath] = {
      id: programDbPath, filename: programDbPath, loaded: true,
      exports: {
        getActiveByFamily: async () => null,
        getByFamily: async () => null,
      },
      children: [], parent: null, paths: [],
    };
    delete require.cache[eligPath];
    const { isEligibleForActivationEmail, INACTIVITY_DAYS } = require(eligPath);

    assert.equal(INACTIVITY_DAYS, 7);
    assert.equal(await isEligibleForActivationEmail('fam-1'), false);
  });

  it('direct choice blocks re-show via analytics enroll_choice', async () => {
    const dbPath = require.resolve('../src/lib/db');
    const programDbPath = require.resolve('../db/parent-activation-program');
    const eligPath = require.resolve('../src/lib/activation-program-eligibility');

    const mockDb = {
      query: async (sql) => {
        if (sql.includes('analytics_events')) return { rows: [{ '?': 1 }] };
        return { rows: [] };
      },
    };

    require.cache[dbPath] = {
      id: dbPath, filename: dbPath, loaded: true, exports: mockDb, children: [], parent: null, paths: [],
    };
    require.cache[programDbPath] = {
      id: programDbPath, filename: programDbPath, loaded: true,
      exports: {
        getActiveByFamily: async () => null,
        getByFamily: async () => null,
      },
      children: [], parent: null, paths: [],
    };
    delete require.cache[eligPath];
    const { canShowOnboardingEnrollChoice } = require(eligPath);

    assert.equal(await canShowOnboardingEnrollChoice({
      familyId: 'fam-1',
      onboardingCompleted: true,
    }), false);
  });
});

describe('Fas 4 — UI assets and infrastructure', () => {
  it('enroll-choice JS posts to enroll-choice API', () => {
    const js = fs.readFileSync(
      path.join(__dirname, '../public/js/activation-program-enroll-choice.js'),
      'utf8'
    );
    assert.ok(js.includes('/api/me/activation-program/enroll-choice'));
    assert.ok(js.includes("submitChoice('guided')"));
    assert.ok(js.includes("'direct'"));
    assert.ok(js.includes('onboarding_complete'));
    assert.ok(js.includes('email_reactivation'));
  });

  it('activation-enroll.html loads enroll-choice script', () => {
    const html = fs.readFileSync(
      path.join(__dirname, '../public/activation-enroll.html'),
      'utf8'
    );
    assert.ok(html.includes('activationEnrollRoot'));
    assert.ok(html.includes('activation-program-enroll-choice.js'));
  });

  it('migration defines enroll_source and email invite table', () => {
    const mig = fs.readFileSync(
      path.join(__dirname, '../migrations/1799700000000_activation_program_enroll_source.js'),
      'utf8'
    );
    assert.ok(mig.includes('enroll_source'));
    assert.ok(mig.includes('onboarding_complete'));
    assert.ok(mig.includes('email_reactivation'));
    assert.ok(mig.includes('activation_program_email_invite'));
  });

  it('analytics module exports Fas 4 events', () => {
    const analytics = require('../src/lib/activation-program-analytics');
    assert.equal(typeof analytics.trackEnrollChoice, 'function');
    assert.equal(typeof analytics.trackProgramStarted, 'function');
    assert.equal(typeof analytics.trackEmailInviteSent, 'function');
    assert.equal(typeof analytics.trackEmailInviteClicked, 'function');
  });

  it('parent_activation_program create supports enrollSource', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../db/parent-activation-program.js'),
      'utf8'
    );
    assert.ok(src.includes('enrollSource'));
    assert.ok(src.includes('enroll_source'));
  });

  it('email scheduler is wired in server.js', () => {
    const src = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
    assert.ok(src.includes('startActivationEmailScheduler'));
    assert.ok(src.includes('stopActivationEmailScheduler'));
  });
});
