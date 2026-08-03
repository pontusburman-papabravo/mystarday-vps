'use strict';

/**
 * Gate personal referral CTA — only after proven value, without critical blockers.
 * Reuses referral_program + growth_referral_cta_v1 flags.
 */

const { isActivationFlagEnabled, FLAG_KEYS } = require('./activation-flags');
const { getCriticalBlockers } = require('./growth-feedback-eligibility');
const db = require('./db');

const GROWTH_REFERRAL_FLAG = 'growth_referral_cta_v1';

async function hasProvenValue(familyId) {
  const result = await db.query(
    `SELECT
       (s.first_completion_at IS NOT NULL) AS has_completion,
       (s.p0_activated_at IS NOT NULL) AS has_p0,
       EXISTS (
         SELECT 1 FROM family_milestones fm
         WHERE fm.family_id = $1 AND fm.milestone = 'first_success'
       ) AS has_first_success
     FROM family_activation_state s
     WHERE s.family_id = $1`,
    [familyId]
  );
  const row = result.rows[0];
  if (!row) return false;
  return Boolean(row.has_completion || row.has_p0 || row.has_first_success);
}

/**
 * @param {string} familyId
 * @returns {Promise<{ eligible: boolean, reason: string, blockers?: string[] }>}
 */
async function evaluateReferralEligibility(familyId) {
  const programOn = await isActivationFlagEnabled(FLAG_KEYS.referral, familyId);
  if (!programOn) {
    return { eligible: false, reason: 'referral_program_off' };
  }
  const ctaOn = await isActivationFlagEnabled(GROWTH_REFERRAL_FLAG, familyId);
  if (!ctaOn) {
    return { eligible: false, reason: 'growth_referral_cta_off' };
  }

  const blockers = await getCriticalBlockers(familyId);
  // Competing next steps — do not show referral during activation blockers
  const critical = blockers.filter((b) =>
    ['onboarding_incomplete', 'no_child', 'schema_no_child_login', 'login_no_completion'].includes(b)
  );
  if (critical.length > 0) {
    return { eligible: false, reason: 'critical_blocker', blockers: critical };
  }

  const proven = await hasProvenValue(familyId);
  if (!proven) {
    return { eligible: false, reason: 'no_value_yet', blockers };
  }

  return { eligible: true, reason: 'ok', blockers };
}

module.exports = {
  GROWTH_REFERRAL_FLAG,
  evaluateReferralEligibility,
  hasProvenValue,
};
