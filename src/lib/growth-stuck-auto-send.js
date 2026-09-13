'use strict';

/**
 * Auto-send policy for founder stuck-family intervention emails.
 * Flag: growth_stuck_cohorts_v1 (scheduler only — admin reads stay ungated).
 */

const db = require('./db');
const { interventionKeyForCohort } = require('./growth-stuck-intervention-templates');

const FLAG_KEY = 'growth_stuck_cohorts_v1';

/** Cohorts with founder email templates — excludes core_flow_errors (manual only). */
const AUTO_SEND_BLOCKING_STEPS = new Set([
  'onboarding_incomplete',
  'schema_no_child_login',
  'login_no_completion',
  'completion_no_return',
]);

async function isGrowthStuckAutoSendEnabled() {
  if (process.env.GROWTH_STUCK_AUTO_SEND_ENABLED === 'false') return false;
  const { rows } = await db.query(
    'SELECT enabled FROM feature_flag WHERE key = $1 LIMIT 1',
    [FLAG_KEY]
  );
  return rows[0]?.enabled === true;
}

function isAutoSendBlockingStep(blockingStep) {
  return Boolean(blockingStep && AUTO_SEND_BLOCKING_STEPS.has(blockingStep));
}

function isAutoSendCohort(blockingStep) {
  return isAutoSendBlockingStep(blockingStep)
    && Boolean(interventionKeyForCohort(blockingStep));
}

function resolveFamilyAutoSendAllowed(blockingStep, autoSendEnabled) {
  return autoSendEnabled === true && isAutoSendCohort(blockingStep);
}

module.exports = {
  FLAG_KEY,
  AUTO_SEND_BLOCKING_STEPS,
  isGrowthStuckAutoSendEnabled,
  isAutoSendBlockingStep,
  isAutoSendCohort,
  resolveFamilyAutoSendAllowed,
};
