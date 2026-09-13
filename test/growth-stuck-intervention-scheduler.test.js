'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  AUTO_SEND_BLOCKING_STEPS,
  isAutoSendCohort,
  resolveFamilyAutoSendAllowed,
} = require('../src/lib/growth-stuck-auto-send');
const { COHORTS } = require('../src/lib/growth-stuck-work-queue');
const { GROWTH_STUCK_INTERVENTION_LOCK_ID } = require('../src/lib/scheduler-constants');

const ROOT = path.join(__dirname, '..');

describe('growth-stuck-auto-send policy', () => {
  it('allows auto-send for four founder-template cohorts only', () => {
    assert.equal(isAutoSendCohort(COHORTS.onboarding_incomplete), true);
    assert.equal(isAutoSendCohort(COHORTS.schema_no_child_login), true);
    assert.equal(isAutoSendCohort(COHORTS.login_no_completion), true);
    assert.equal(isAutoSendCohort(COHORTS.completion_no_return), true);
    assert.equal(isAutoSendCohort(COHORTS.core_flow_errors), false);
    assert.equal(AUTO_SEND_BLOCKING_STEPS.size, 4);
  });

  it('resolveFamilyAutoSendAllowed respects flag', () => {
    assert.equal(
      resolveFamilyAutoSendAllowed(COHORTS.onboarding_incomplete, true),
      true
    );
    assert.equal(
      resolveFamilyAutoSendAllowed(COHORTS.onboarding_incomplete, false),
      false
    );
    assert.equal(
      resolveFamilyAutoSendAllowed(COHORTS.core_flow_errors, true),
      false
    );
  });
});

describe('growth-stuck-intervention scheduler wiring', () => {
  it('scheduler uses advisory lock and reuses sendStuckIntervention', () => {
    const scheduler = fs.readFileSync(
      path.join(ROOT, 'src/lib/growth-stuck-intervention-scheduler.js'),
      'utf8'
    );
    assert.match(scheduler, /withAdvisoryLock\(GROWTH_STUCK_INTERVENTION_LOCK_ID/);
    assert.match(scheduler, /sendStuckIntervention\(/);
    assert.match(scheduler, /isGrowthStuckAutoSendEnabled/);
    assert.match(scheduler, /listGrowthStuckCohorts/);
    assert.equal(GROWTH_STUCK_INTERVENTION_LOCK_ID, 1018);
  });

  it('server starts and stops growth stuck scheduler', () => {
    const server = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
    assert.match(server, /startGrowthStuckInterventionScheduler/);
    assert.match(server, /stopGrowthStuckInterventionScheduler/);
  });

  it('migration enables growth_stuck_cohorts_v1', () => {
    const mig = fs.readFileSync(
      path.join(ROOT, 'migrations/1810510000000_enable_growth_stuck_auto_send.js'),
      'utf8'
    );
    assert.match(mig, /growth_stuck_cohorts_v1/);
    assert.match(mig, /enabled = EXCLUDED\.enabled/);
  });
});
