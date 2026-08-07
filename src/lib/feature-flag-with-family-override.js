'use strict';

const db = require('./db');
const familyOverrides = require('../../db/family-feature-overrides');
const overrideCache = require('./activation-flag-family-cache');

/**
 * Canonical per-family feature_flag resolution (activation-style precedence).
 *
 * 1. Missing / archived family → OFF
 * 2. Explicit family deny override → OFF
 * 3. Explicit family allow override → ON (bypasses global OFF)
 * 4. Global feature_flag OFF → OFF
 * 5. Global ON + no override → ON
 *
 * @param {string} featureKey feature_flag.key
 * @param {string} [familyId]
 * @returns {Promise<boolean>} fail-closed on error
 */
async function isFeatureEnabledForFamily(featureKey, familyId) {
  try {
    if (familyId && familyOverrides.isOverrideFeatureKey(featureKey)) {
      const cached = overrideCache.getCached(familyId, featureKey);
      if (cached === 'allow') return true;
      if (cached === 'deny') return false;

      const lifecycle = await familyOverrides.getFamilyLifecycle(familyId);
      if (!lifecycle || lifecycle.archived_at) {
        overrideCache.setCached(familyId, featureKey, 'deny');
        return false;
      }

      const override = await familyOverrides.getActiveOverride(familyId, featureKey);
      if (override) {
        const decision = override.enabled ? 'allow' : 'deny';
        overrideCache.setCached(familyId, featureKey, decision);
        return override.enabled;
      }
      overrideCache.setCached(familyId, featureKey, 'none');
    }

    const result = await db.query('SELECT enabled FROM feature_flag WHERE key = $1 LIMIT 1', [
      featureKey,
    ]);
    return result.rows[0]?.enabled === true;
  } catch (err) {
    console.error('[FEATURE-FLAG] check failed for', featureKey, ':', err.message);
    return false;
  }
}

module.exports = {
  isFeatureEnabledForFamily,
};
