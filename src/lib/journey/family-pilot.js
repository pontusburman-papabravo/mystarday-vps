'use strict';

/**
 * Per-family Journey Hem pilot — enables Wave-1–3 API/coach flags for one family
 * while global feature_flag stays OFF (prod-safe rollback: delete override row).
 */
const familyOverrides = require('../../../db/family-feature-overrides');

const PILOT_OVERRIDE_KEY = 'family_journey_hem_pilot_v1';

/** Flags treated as ON when family pilot override is active. */
const PILOT_ENABLED_FLAG_KEYS = new Set([
  'family_journey_context_api',
  'family_journey_ingest_enabled',
  'family_journey_evaluator_enabled',
  'family_journey_registry_v2',
  'family_journey_handoff_v2',
  'family_journey_parent_ack_v1',
  'family_journey_onboarding_v1',
  'family_journey_established_phase',
  'family_journey_coach_v1',
  'family_journey_engine_shadow',
]);

const { isFlagEnabled } = require('./flags');

async function isFamilyJourneyPilotEnabled(familyId) {
  if (!familyId) return false;
  const row = await familyOverrides.getActiveOverride(familyId, PILOT_OVERRIDE_KEY);
  return Boolean(row && row.enabled);
}

/**
 * Global ON wins; else family pilot may enable allowlisted journey keys only.
 */
async function isJourneyFlagEnabledForFamily(key, familyId) {
  if (await isFlagEnabled(key)) return true;
  if (!familyId || !PILOT_ENABLED_FLAG_KEYS.has(key)) return false;
  return isFamilyJourneyPilotEnabled(familyId);
}

module.exports = {
  PILOT_OVERRIDE_KEY,
  PILOT_ENABLED_FLAG_KEYS,
  isFamilyJourneyPilotEnabled,
  isJourneyFlagEnabledForFamily,
};
