'use strict';

const db = require('./db');

/**
 * Mark parent onboarding complete (auth/routing only — not Journey authority).
 * Idempotent per parent row.
 * @param {string} parentId
 * @param {string} familyId
 * @returns {Promise<boolean>} true if row was updated
 */
async function markParentOnboardingComplete(parentId, familyId) {
  const result = await db.query(
    `UPDATE parent
     SET onboarding_completed = true
     WHERE id = $1 AND onboarding_completed = false
     RETURNING id`,
    [parentId]
  );
  if (!result.rows[0]) return false;
  require('./analytics-tracker').trackOnboardingCompleted(familyId);
  const { recomputePhase } = require('./journey/ingest');
  await recomputePhase(familyId);
  return true;
}

module.exports = { markParentOnboardingComplete };
