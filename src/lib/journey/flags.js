'use strict';

const db = require('../db.js');

const FLAG_KEYS = {
  contextApi: 'family_journey_context_api',
  onboardingV1: 'family_journey_onboarding_v1',
  ingestEnabled: 'family_journey_ingest_enabled',
  evaluatorEnabled: 'family_journey_evaluator_enabled',
  debugApi: 'family_journey_debug_api',
  registryV2: 'family_journey_registry_v2',
  handoffV2: 'family_journey_handoff_v2',
  parentAckV1: 'family_journey_parent_ack_v1',
  activationNewEnrollments: 'activation_program_new_enrollments',
  coachV1: 'family_journey_coach_v1',
  establishedPhase: 'family_journey_established_phase',
  engineShadow: 'family_journey_engine_shadow',
  activationApiDeprecated: 'activation_program_api_deprecated',
  activationUiRemoved: 'activation_program_ui_removed',
  expandingPhase: 'family_journey_expanding_phase',
  independencePhase: 'family_journey_independence_phase',
  pushV1: 'family_journey_push_v1',
  addChildV1: 'family_journey_add_child_v1',
  firstWeekV1: 'family_journey_first_week_v1',
  firstMonthV1: 'family_journey_first_month_v1',
};

async function isFlagEnabled(key) {
  try {
    const result = await db.query(
      'SELECT enabled FROM feature_flag WHERE key = $1 LIMIT 1',
      [key]
    );
    return Boolean(result.rows[0]?.enabled);
  } catch (err) {
    console.error('[journey-flags] DB error for', key, ':', err.message);
    return false;
  }
}

async function getFlagState() {
  const entries = await Promise.all(
    Object.entries(FLAG_KEYS).map(async ([name, key]) => [name, await isFlagEnabled(key)])
  );
  return Object.fromEntries(entries);
}

module.exports = {
  FLAG_KEYS,
  isFlagEnabled,
  getFlagState,
};
