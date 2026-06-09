/**
 * Parent activation program — enrollment + A/B assignment.
 * Invariants: docs/activation-program-invariants.md
 */

const crypto = require('crypto');
const { DateTime } = require('luxon');

const MVP_PROGRAM_TYPE = 'onboarding_7d';

/**
 * Deterministic 0–99 bucket from family_id (reproducible cohort arm).
 */
function hashToPercent(familyId) {
  const hash = crypto.createHash('sha256').update(String(familyId)).digest();
  return hash.readUInt32BE(0) % 100;
}

function getTreatmentPercent() {
  const parsed = parseInt(process.env.ACTIVATION_PROGRAM_TREATMENT_PCT ?? '50', 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 100) : 50;
}

function getSmokeTestDays() {
  const parsed = parseInt(process.env.ACTIVATION_PROGRAM_SMOKE_TEST_DAYS ?? '3', 10);
  return Number.isFinite(parsed) ? parsed : 3;
}

function isInSmokePeriod() {
  const launchAt = process.env.ACTIVATION_PROGRAM_LAUNCH_AT;
  if (!launchAt) return false;

  const launch = DateTime.fromISO(launchAt, { zone: 'utc' });
  if (!launch.isValid) return false;

  const smokeDays = getSmokeTestDays();
  return DateTime.utc().diff(launch, 'days').days < smokeDays;
}

/**
 * Assign treatment or control at enroll time (invariant #5 — control exists in DB).
 */
function assignCohortArm(familyId) {
  const pct = isInSmokePeriod() ? 100 : getTreatmentPercent();
  return hashToPercent(familyId) < pct ? 'treatment' : 'control';
}

/**
 * Invariant #12 — no enrollment before ACTIVATION_PROGRAM_LAUNCH_AT.
 */
function isPostLaunchEnrollment(now = DateTime.utc()) {
  const launchAt = process.env.ACTIVATION_PROGRAM_LAUNCH_AT;
  if (!launchAt) return false;

  const launch = DateTime.fromISO(launchAt, { zone: 'utc' });
  if (!launch.isValid) return false;

  return now >= launch;
}

function isActivationProgramEnabled() {
  return process.env.ACTIVATION_PROGRAM_ENABLED === 'true';
}

/**
 * MVP enrollment eligibility (invariant #15 — onboarding_7d only).
 */
function canEnrollOnboardingProgram({
  onboardingJustCompleted = false,
  hasActiveProgram = false,
  now = DateTime.utc(),
} = {}) {
  return (
    isActivationProgramEnabled() &&
    onboardingJustCompleted &&
    !hasActiveProgram &&
    isPostLaunchEnrollment(now)
  );
}

module.exports = {
  MVP_PROGRAM_TYPE,
  hashToPercent,
  assignCohortArm,
  isPostLaunchEnrollment,
  isActivationProgramEnabled,
  canEnrollOnboardingProgram,
  isInSmokePeriod,
};
