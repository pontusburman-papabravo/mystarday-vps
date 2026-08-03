'use strict';

const db = require('../src/lib/db');

/**
 * Allowlisted feature_flag.key values that support per-family overrides.
 */
const OVERRIDE_FEATURE_KEYS = new Set([
  'activation_first_success_v1',
]);

function isOverrideFeatureKey(featureKey) {
  return OVERRIDE_FEATURE_KEYS.has(featureKey);
}

function assertOverrideFeatureKey(featureKey) {
  if (!isOverrideFeatureKey(featureKey)) {
    const err = new Error(`Feature key not allowlisted for family override: ${featureKey}`);
    err.code = 'FEATURE_OVERRIDE_KEY_NOT_ALLOWED';
    throw err;
  }
}

/**
 * @returns {Promise<{ enabled: boolean, reason: string | null, expires_at: Date | null } | null>}
 */
async function getActiveOverride(familyId, featureKey) {
  if (!familyId || !isOverrideFeatureKey(featureKey)) return null;
  const result = await db.query(
    `SELECT enabled, reason, expires_at
     FROM family_feature_override
     WHERE family_id = $1 AND feature_key = $2
       AND (expires_at IS NULL OR expires_at > NOW())
     LIMIT 1`,
    [familyId, featureKey]
  );
  return result.rows[0] || null;
}

async function upsertOverride(familyId, featureKey, enabled, meta = {}) {
  assertOverrideFeatureKey(featureKey);
  const result = await db.query(
    `INSERT INTO family_feature_override (
       family_id, feature_key, enabled, reason, source, created_by, expires_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (family_id, feature_key) DO UPDATE SET
       enabled = EXCLUDED.enabled,
       reason = EXCLUDED.reason,
       source = EXCLUDED.source,
       created_by = EXCLUDED.created_by,
       expires_at = EXCLUDED.expires_at,
       updated_at = NOW()
     RETURNING family_id, feature_key, enabled, reason, expires_at, updated_at`,
    [
      familyId,
      featureKey,
      Boolean(enabled),
      meta.reason || null,
      meta.source || 'cli',
      meta.createdBy || null,
      meta.expiresAt || null,
    ]
  );
  return result.rows[0];
}

async function removeOverride(familyId, featureKey) {
  assertOverrideFeatureKey(featureKey);
  const result = await db.query(
    `DELETE FROM family_feature_override
     WHERE family_id = $1 AND feature_key = $2
     RETURNING family_id, feature_key`,
    [familyId, featureKey]
  );
  return result.rows[0] || null;
}

async function getFamilyLifecycle(familyId) {
  const result = await db.query(
    `SELECT id, created_at, archived_at FROM family WHERE id = $1 LIMIT 1`,
    [familyId]
  );
  return result.rows[0] || null;
}

module.exports = {
  OVERRIDE_FEATURE_KEYS,
  isOverrideFeatureKey,
  assertOverrideFeatureKey,
  getActiveOverride,
  upsertOverride,
  removeOverride,
  getFamilyLifecycle,
};
