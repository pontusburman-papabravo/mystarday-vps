'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  ACTIVATION_ERROR_CODES,
  STEP_STATUSES,
  httpStatusToScheduleErrorCode,
} = require('../src/lib/activation/error-codes');
const { resolveContinueDestination } = require('../src/lib/activation/continue-destination');
const { loadLocales, t } = require('../src/lib/i18n');

const ROOT = path.join(__dirname, '..');

describe('activation error codes', () => {
  it('maps HTTP status to stable schedule codes', () => {
    assert.equal(httpStatusToScheduleErrorCode(401), ACTIVATION_ERROR_CODES.SCHEDULE_LOAD_401);
    assert.equal(httpStatusToScheduleErrorCode(429), ACTIVATION_ERROR_CODES.SCHEDULE_LOAD_429);
    assert.equal(httpStatusToScheduleErrorCode(502), ACTIVATION_ERROR_CODES.SCHEDULE_LOAD_5XX);
  });

  it('skipped_by_user is distinct from completed', () => {
    assert.notEqual(STEP_STATUSES.SKIPPED_BY_USER, STEP_STATUSES.COMPLETED);
  });
});

describe('continue destination — real state only', () => {
  it('save_schedule skip without schema goes to schedule editor', () => {
    const dest = resolveContinueDestination({
      stepId: 'save_schedule',
      activationState: { child_created_at: new Date() },
      childHasSchedule: false,
    });
    assert.equal(dest.url, '/schedule');
  });

  it('save_schedule skip with schema points toward child access', () => {
    const dest = resolveContinueDestination({
      stepId: 'save_schedule',
      activationState: {
        child_created_at: new Date(),
        schema_saved_at: new Date(),
      },
      childHasSchedule: true,
    });
    assert.equal(dest.url, '/dashboard');
    assert.equal(dest.reason, 'child_access_next');
  });
});

describe('activation recoverable client contract', () => {
  it('hub exposes dismissCoach and loads recoverable scripts on dashboard', () => {
    const dash = fs.readFileSync(path.join(ROOT, 'public/dashboard.html'), 'utf8');
    assert.match(dash, /activation-recoverable-core\.js/);
    assert.match(dash, /activation-schedule-picker\.js/);
    const hub = fs.readFileSync(path.join(ROOT, 'public/js/activation-first-success-hub.js'), 'utf8');
    assert.match(hub, /dismissCoach/);
    assert.match(hub, /activation_step_viewed/);
    assert.match(hub, /skipped_by_user/);
  });

  it('schedule picker uses AbortController timeout and retry', () => {
    const picker = fs.readFileSync(path.join(ROOT, 'public/js/activation-schedule-picker.js'), 'utf8');
    assert.match(picker, /AbortController/);
    assert.match(picker, /activation_schedule_retry/);
    assert.match(picker, /destroy/);
  });

  it('recoverable core prevents double report via cooldown', () => {
    const core = fs.readFileSync(path.join(ROOT, 'public/js/activation-recoverable-core.js'), 'utf8');
    assert.match(core, /reportInFlight/);
    assert.match(core, /REPORT_COOLDOWN_MS/);
  });
});

before(() => {
  loadLocales();
});

describe('activation recoverable i18n', () => {
  for (const lang of ['sv-SE', 'en-GB']) {
    it(`${lang} human schedule load 5xx message`, () => {
      const key = 'home.activationRecoverable.errors.ACTIVATION_SCHEDULE_LOAD_5XX';
      const value = t(lang, key);
      assert.notEqual(value, key);
      assert.ok(value.length > 10);
    });
  }
});

describe('activation recoverable API surface', () => {
  it('family router mounts activation-recoverable routes', () => {
    const idx = fs.readFileSync(path.join(ROOT, 'src/routes/family/index.js'), 'utf8');
    assert.match(idx, /activation-recoverable/);
    const routes = fs.readFileSync(path.join(ROOT, 'src/routes/family/activation-recoverable.js'), 'utf8');
    assert.match(routes, /schedule-options/);
    assert.match(routes, /step-status/);
    assert.match(routes, /problem-report/);
  });

  it('analytics allowlists activation recoverable events', () => {
    const analytics = fs.readFileSync(path.join(ROOT, 'src/routes/analytics.js'), 'utf8');
    assert.match(analytics, /activation_schedule_load_failed/);
    assert.match(analytics, /activation_continue_anyway/);
  });
});

describe('activation schedule-options integration', () => {
  it('returns empty flag when no templates', async (t) => {
    const { setupTestDb } = require('./helpers/setup.js');
    const { buildActivationScheduleOptions } = require('../src/lib/activation/schedule-options');
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No DATABASE_URL');
      return;
    }
    try {
      const fam = await db.query(
        `INSERT INTO family (name, timezone) VALUES ('Sched Empty', 'Europe/Stockholm') RETURNING id`
      );
      const data = await buildActivationScheduleOptions(fam.rows[0].id);
      assert.equal(typeof data.empty, 'boolean');
      assert.ok(Array.isArray(data.starter_templates));
      assert.ok(Array.isArray(data.family_templates));
    } finally {
      await db.cleanup();
    }
  });
});
