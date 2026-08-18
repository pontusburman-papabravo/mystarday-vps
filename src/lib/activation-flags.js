'use strict';

const db = require('./db');
const familyOverrides = require('../../db/family-feature-overrides');
const overrideCache = require('./activation-flag-family-cache');

const FLAG_KEYS = {
  onboarding: 'activation_onboarding_v1',
  childHandoff: 'activation_child_handoff_v1',
  firstStarGuide: 'activation_first_star_guide_v1',
  firstStarMode: 'activation_first_star_mode_v1',
  aiStarterPlan: 'activation_ai_starter_plan',
  custodySchedule: 'custody_schedule_beta',
  printScan: 'print_scan_beta',
  referral: 'referral_program',
  nudge: 'activation_nudge_v1',
  signupSlim: 'activation_signup_slim_v1',
  handoffFilm: 'activation_onboarding_handoff_film_v1',
  growthFeedback: 'growth_feedback_v1',
  growthSystemHelp: 'growth_system_help_v1',
  growthReferralCta: 'growth_referral_cta_v1',
  /** Future stuck-family intervention/send only — never gates admin cohort reads. */
  growthStuckCohorts: 'growth_stuck_cohorts_v1',
  growthWaitlistFunnel: 'growth_waitlist_funnel_v1',
  firstSuccessV1: 'activation_first_success_v1',
};

/** PR 1–4 rollout — template, handoff, first star guide, AI (excludes PR 5 nudge). */
const ACT1_PR14_FLAG_KEYS = [
  FLAG_KEYS.onboarding,
  FLAG_KEYS.childHandoff,
  FLAG_KEYS.firstStarGuide,
  FLAG_KEYS.aiStarterPlan,
  FLAG_KEYS.handoffFilm,
];

/** Core ACT-1 onboarding flags — includes PR 5 nudge; excludes legacy 7-day program. */
const ACT1_ONBOARDING_FLAG_KEYS = [
  ...ACT1_PR14_FLAG_KEYS,
  FLAG_KEYS.nudge,
];

/** Global rollout — not limited to families created after ACTIVATION_ONBOARDING_LAUNCH_AT */
const COHORT_EXEMPT_FLAG_KEYS = new Set([
  FLAG_KEYS.custodySchedule,
]);

function parseLaunchAt() {
  const raw = process.env.ACTIVATION_ONBOARDING_LAUNCH_AT;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Precedence (family override keys only):
 * 1. Missing / archived family → OFF
 * 2. Explicit family deny override → OFF
 * 3. Explicit family allow override → ON (bypasses global OFF + cohort)
 * 4. Global feature_flag OFF → OFF
 * 5. Cohort / launch rule
 * 6. Default ON when global enabled
 *
 * @param {string} key feature_flag.key
 * @param {string} [familyId] optional cohort filter by family.created_at
 * @returns {Promise<boolean>} never throws — returns false on DB error (fail-closed)
 */
async function isActivationFlagEnabled(key, familyId) {
  try {
    if (familyId && familyOverrides.isOverrideFeatureKey(key)) {
      const cached = overrideCache.getCached(familyId, key);
      if (cached === 'allow') return true;
      if (cached === 'deny') return false;

      const lifecycle = await familyOverrides.getFamilyLifecycle(familyId);
      if (!lifecycle || lifecycle.archived_at) {
        overrideCache.setCached(familyId, key, 'deny');
        return false;
      }

      const override = await familyOverrides.getActiveOverride(familyId, key);
      if (override) {
        const decision = override.enabled ? 'allow' : 'deny';
        overrideCache.setCached(familyId, key, decision);
        return override.enabled;
      }
      overrideCache.setCached(familyId, key, 'none');
    }

    const result = await db.query(
      'SELECT enabled FROM feature_flag WHERE key = $1 LIMIT 1',
      [key]
    );
    if (!result.rows[0]?.enabled) return false;

    if (COHORT_EXEMPT_FLAG_KEYS.has(key)) return true;

    const launchAt = parseLaunchAt();
    if (!launchAt || !familyId) return true;

    const fam = await db.query('SELECT created_at FROM family WHERE id = $1 LIMIT 1', [familyId]);
    if (!fam.rows[0]?.created_at) return true;
    return new Date(fam.rows[0].created_at) >= launchAt;
  } catch (err) {
    console.error('[ACTIVATION-FLAGS] Check failed for', key, ':', err.message);
    return false;
  }
}

module.exports = {
  FLAG_KEYS,
  ACT1_PR14_FLAG_KEYS,
  ACT1_ONBOARDING_FLAG_KEYS,
  isActivationFlagEnabled,
};
