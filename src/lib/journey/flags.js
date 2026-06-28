'use strict';

const db = require('../db.js');

const FLAG_KEYS = {
  contextApi: 'family_journey_context_api',
  onboardingV1: 'family_journey_onboarding_v1',
  ingestEnabled: 'family_journey_ingest_enabled',
  evaluatorEnabled: 'family_journey_evaluator_enabled',
  debugApi: 'family_journey_debug_api',
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
