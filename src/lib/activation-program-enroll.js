/**
 * Parent activation program — enrollment (Fas 4: föräldraval, ingen auto-enroll).
 * Invariants: docs/activation-program-invariants.md
 */

const crypto = require('crypto');
const { DateTime } = require('luxon');

const MVP_PROGRAM_TYPE = 'onboarding_7d';
const ENROLL_SOURCES = new Set(['onboarding_complete', 'email_reactivation']);
const ENROLL_CHOICES = new Set(['guided', 'direct']);

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
 * Future A/B — not used at go live (contract § Cohort).
 */
function assignCohortArm(familyId) {
  const pct = isInSmokePeriod() ? 100 : getTreatmentPercent();
  return hashToPercent(familyId) < pct ? 'treatment' : 'control';
}

/**
 * Go live: all guided enrollments are treatment (no random A/B).
 */
function assignCohortArmAtLaunch() {
  if (process.env.ACTIVATION_PROGRAM_AB_ENABLED === 'true') {
    return null;
  }
  return 'treatment';
}

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

function isActivationEmailEnabled() {
  return (
    isActivationProgramEnabled() &&
    process.env.ACTIVATION_PROGRAM_EMAIL_ENABLED === 'true'
  );
}

/**
 * @deprecated Fas 4 — use enroll-choice flow instead of auto-enroll.
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

function normalizeEnrollSource(source) {
  return ENROLL_SOURCES.has(source) ? source : null;
}

function normalizeEnrollChoice(choice) {
  return ENROLL_CHOICES.has(choice) ? choice : null;
}

function getCohortArmForEnroll(familyId) {
  const atLaunch = assignCohortArmAtLaunch();
  if (atLaunch) return atLaunch;
  return assignCohortArm(familyId);
}

module.exports = {
  MVP_PROGRAM_TYPE,
  ENROLL_SOURCES,
  ENROLL_CHOICES,
  hashToPercent,
  assignCohortArm,
  assignCohortArmAtLaunch,
  isPostLaunchEnrollment,
  isActivationProgramEnabled,
  isActivationEmailEnabled,
  canEnrollOnboardingProgram,
  isInSmokePeriod,
  normalizeEnrollSource,
  normalizeEnrollChoice,
  getCohortArmForEnroll,
};
