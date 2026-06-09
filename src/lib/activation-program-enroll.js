/**
 * Parent activation program — enrollment + A/B cohort assignment.
 */

const crypto = require('crypto');
const { DateTime } = require('luxon');

function isActivationProgramEnabled() {
  return process.env.ACTIVATION_PROGRAM_ENABLED === 'true';
}

function isPostLaunchEnrollment() {
  const launchAt = process.env.ACTIVATION_PROGRAM_LAUNCH_AT;
  if (!launchAt) return false;
  const launch = DateTime.fromISO(launchAt, { zone: 'utc' });
  if (!launch.isValid) return false;
  return DateTime.utc() >= launch;
}

/**
 * Deterministisk 0–99 från family_id.
 */
function hashToPercent(familyId) {
  const hash = crypto.createHash('sha256').update(String(familyId)).digest();
  return hash[0] % 100;
}

/**
 * Smoke-aware cohort assignment (§13.2).
 */
function assignCohortArm(familyId) {
  const smokeDays = parseInt(process.env.ACTIVATION_PROGRAM_SMOKE_TEST_DAYS ?? '3', 10);
  const launchAt = process.env.ACTIVATION_PROGRAM_LAUNCH_AT;
  let inSmoke = false;
  if (launchAt) {
    const launch = DateTime.fromISO(launchAt, { zone: 'utc' });
    if (launch.isValid) {
      inSmoke = DateTime.utc().diff(launch, 'days').days < smokeDays;
    }
  }
  const pct = inSmoke
    ? 100
    : parseInt(process.env.ACTIVATION_PROGRAM_TREATMENT_PCT ?? '50', 10);
  return hashToPercent(familyId) < pct ? 'treatment' : 'control';
}

/**
 * Eligibility for onboarding_7d auto-enroll (Fas 4).
 */
async function canEnrollOnboardingProgram({ wasAlreadyOnboarded, familyId, getActiveProgram }) {
  if (!isActivationProgramEnabled()) return false;
  if (!isPostLaunchEnrollment()) return false;
  if (wasAlreadyOnboarded) return false;
  const existing = await getActiveProgram(familyId);
  if (existing) return false;
  return true;
}

module.exports = {
  isActivationProgramEnabled,
  isPostLaunchEnrollment,
  hashToPercent,
  assignCohortArm,
  canEnrollOnboardingProgram,
};
