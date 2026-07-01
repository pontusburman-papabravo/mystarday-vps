'use strict';

const db = require('./db');

const FLAG_KEYS = {
  onboarding: 'activation_onboarding_v1',
  childHandoff: 'activation_child_handoff_v1',
  firstStarGuide: 'activation_first_star_guide_v1',
  aiStarterPlan: 'activation_ai_starter_plan',
  custodySchedule: 'custody_schedule_beta',
  printScan: 'print_scan_beta',
  referral: 'referral_program',
  nudge: 'activation_nudge_v1',
};

/** Core ACT-1 onboarding flags — excludes legacy 7-day program sunset flags. */
const ACT1_ONBOARDING_FLAG_KEYS = [
  FLAG_KEYS.onboarding,
  FLAG_KEYS.childHandoff,
  FLAG_KEYS.firstStarGuide,
  FLAG_KEYS.aiStarterPlan,
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
 * @param {string} key feature_flag.key
 * @param {string} [familyId] optional cohort filter by family.created_at
 */
async function isActivationFlagEnabled(key, familyId) {
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
}

module.exports = {
  FLAG_KEYS,
  ACT1_ONBOARDING_FLAG_KEYS,
  isActivationFlagEnabled,
};
