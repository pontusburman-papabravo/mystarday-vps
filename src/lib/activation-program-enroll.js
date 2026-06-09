/**
 * Parent activation program — A/B cohort assignment and launch cutoff.
 * Fas 1: helpers only; enrollment hook in Fas 4.
 */
'use strict';

const crypto = require('crypto');
const { DateTime } = require('luxon');

/**
 * Deterministic 0–99 bucket from family_id (reproducible cohort arm).
 * @param {string} familyId UUID
 * @returns {number}
 */
function hashToPercent(familyId) {
  const hash = crypto.createHash('sha256').update(String(familyId)).digest();
  return hash.readUInt32BE(0) % 100;
}

/**
 * True when ACTIVATION_PROGRAM_LAUNCH_AT is set and now >= launch (UTC).
 * Families enrolling before launch are excluded from the experiment cohort.
 */
function isPostLaunchEnrollment(now = DateTime.utc()) {
  const launchAt = process.env.ACTIVATION_PROGRAM_LAUNCH_AT;
  if (!launchAt) return false;
  const launch = DateTime.fromISO(launchAt, { zone: 'utc' });
  if (!launch.isValid) return false;
  return now >= launch;
}

/**
 * Assign treatment or control arm. Smoke period forces 100% treatment (§13.2).
 * @param {string} familyId
 * @param {import('luxon').DateTime} [now] UTC reference time (for tests)
 * @returns {'treatment'|'control'}
 */
function assignCohortArm(familyId, now = DateTime.utc()) {
  const smokeDays = parseInt(process.env.ACTIVATION_PROGRAM_SMOKE_TEST_DAYS ?? '3', 10);
  const launchAtRaw = process.env.ACTIVATION_PROGRAM_LAUNCH_AT;

  let pct;
  if (launchAtRaw) {
    const launchAt = DateTime.fromISO(launchAtRaw, { zone: 'utc' });
    const inSmoke = launchAt.isValid && now.diff(launchAt, 'days').days < smokeDays;
    pct = inSmoke
      ? 100
      : parseInt(process.env.ACTIVATION_PROGRAM_TREATMENT_PCT ?? '50', 10);
  } else {
    pct = parseInt(process.env.ACTIVATION_PROGRAM_TREATMENT_PCT ?? '100', 10);
  }

  return hashToPercent(familyId) < pct ? 'treatment' : 'control';
}

module.exports = {
  hashToPercent,
  isPostLaunchEnrollment,
  assignCohortArm,
};
