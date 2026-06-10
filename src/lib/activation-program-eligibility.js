/**
 * Enrollment eligibility — väg A (onboarding) och väg B (e-post 7+ d inaktiv).
 */

const db = require('./db');
const parentActivationProgram = require('../../db/parent-activation-program');
const {
  isActivationProgramEnabled,
  isPostLaunchEnrollment,
} = require('./activation-program-enroll');

const INACTIVITY_DAYS = 7;

async function familyHasWeeklySchedule(familyId, client = db) {
  const result = await client.query(
    `SELECT 1
     FROM weekly_schedule ws
     JOIN child c ON c.id = ws.child_id
     WHERE c.family_id = $1
     LIMIT 1`,
    [familyId]
  );
  return result.rows.length > 0;
}

async function familyHasParentLoginWithinDays(familyId, days, client = db) {
  const result = await client.query(
    `SELECT 1
     FROM login_event le
     WHERE le.family_id = $1
       AND le.role = 'parent'
       AND le.occurred_at >= NOW() - ($2::int || ' days')::interval
     LIMIT 1`,
    [familyId, days]
  );
  return result.rows.length > 0;
}

async function hasEnrollChoiceDecision(familyId, client = db) {
  const program = await parentActivationProgram.getByFamily(familyId, client);
  if (program) return true;

  const result = await client.query(
    `SELECT 1 FROM analytics_events
     WHERE family_id = $1
       AND event_type = 'activation_program_enroll_choice'
     LIMIT 1`,
    [familyId]
  );
  return result.rows.length > 0;
}

function isProgramFeatureLive(now) {
  return isActivationProgramEnabled() && isPostLaunchEnrollment(now);
}

/**
 * Väg A — visa val-skärm efter onboarding complete.
 */
async function canShowOnboardingEnrollChoice({
  familyId,
  onboardingCompleted = false,
  now,
}, client = db) {
  if (!isProgramFeatureLive(now)) return false;
  if (!onboardingCompleted || !familyId) return false;

  const active = await parentActivationProgram.getActiveByFamily(familyId, client);
  if (active) return false;

  if (await hasEnrollChoiceDecision(familyId, client)) return false;

  return await familyHasWeeklySchedule(familyId, client);
}

/**
 * Väg B — e-post eligibility (7+ hela dagar utan förälder-login).
 */
async function isEligibleForActivationEmail(familyId, client = db) {
  if (!isProgramFeatureLive()) return false;
  if (!familyId) return false;

  const parentRow = await client.query(
    `SELECT p.id, p.onboarding_completed, p.verified, p.is_admin
     FROM parent p
     WHERE p.family_id = $1 AND p.is_admin = false
     ORDER BY p.created_at ASC
     LIMIT 1`,
    [familyId]
  );
  const parent = parentRow.rows[0];
  if (!parent?.onboarding_completed || !parent.verified || parent.is_admin) return false;

  const active = await parentActivationProgram.getActiveByFamily(familyId, client);
  if (active) return false;

  if (await hasEnrollChoiceDecision(familyId, client)) return false;

  const [hasSchedule, recentLogin] = await Promise.all([
    familyHasWeeklySchedule(familyId, client),
    familyHasParentLoginWithinDays(familyId, INACTIVITY_DAYS, client),
  ]);

  return hasSchedule && !recentLogin;
}

/**
 * Väg B — val-skärm via e-postlänk (kräver giltig invite, inte auto-enroll).
 */
async function canShowEmailEnrollChoice({ familyId, inviteToken }, client = db) {
  if (!isProgramFeatureLive()) return false;
  if (!familyId || !inviteToken) return false;

  const invite = await client.query(
    `SELECT 1 FROM activation_program_email_invite
     WHERE token = $1 AND family_id = $2 AND sent_at IS NOT NULL
     LIMIT 1`,
    [inviteToken, familyId]
  );
  if (!invite.rows[0]) return false;

  const active = await parentActivationProgram.getActiveByFamily(familyId, client);
  if (active) return false;

  if (await hasEnrollChoiceDecision(familyId, client)) return false;

  return isEligibleForActivationEmail(familyId, client);
}

module.exports = {
  INACTIVITY_DAYS,
  familyHasWeeklySchedule,
  familyHasParentLoginWithinDays,
  hasEnrollChoiceDecision,
  isProgramFeatureLive,
  canShowOnboardingEnrollChoice,
  isEligibleForActivationEmail,
  canShowEmailEnrollChoice,
};
