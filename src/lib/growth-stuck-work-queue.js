'use strict';

/**
 * Admin work-queue mapping for stuck families (48h–14d).
 * Read/preview only — no send. Future automation must use FLAG_KEYS.growthStuckCohorts
 * (`growth_stuck_cohorts_v1`) as a separate capability, never this mapper.
 */

const COHORTS = Object.freeze({
  onboarding_incomplete: 'onboarding_incomplete',
  schema_no_child_login: 'schema_no_child_login',
  login_no_completion: 'login_no_completion',
  completion_no_return: 'completion_no_return',
  core_flow_errors: 'core_flow_errors',
});

/** Reserved intervention ids — not a send path. */
const FOLLOW_UP = Object.freeze({
  onboarding_incomplete: 'preview_handoff_nudge',
  schema_no_child_login: 'preview_child_login_help',
  login_no_completion: 'preview_first_star_guide',
  completion_no_return: 'preview_return_nudge',
  core_flow_errors: 'preview_support_outreach',
});

const WHY_STUCK = Object.freeze({
  onboarding_incomplete_never_started: 'Onboarding aldrig startad.',
  onboarding_incomplete: 'Onboarding startad men inte slutförd.',
  schema_no_child_login: 'Schema finns, inget barn har loggat in.',
  login_no_completion: 'Barn har loggat in, ingen första completion.',
  completion_no_return: 'Första completion finns, ingen inloggning på 7+ dagar.',
  core_flow_errors: 'Tekniskt fel i kärnflödet (PIN, login eller API) senaste 14 dagarna.',
});

/** In-product system help the app should offer (admin diagnostics mirror). */
const RECOMMENDED_SYSTEM_HELP = Object.freeze({
  onboarding_incomplete: 'Visa onboarding-hjälp: fortsätt spara schema.',
  schema_no_child_login: 'Visa barninloggningshjälp i handoff / hjälppanelen.',
  login_no_completion: 'Visa första-stjärna-guide i schema / hjälppanelen.',
  completion_no_return: 'Visa återkomst-hjälp i schema — inget auto-mejl.',
  core_flow_errors: 'Visa PIN/login-felsökning i hjälppanelen.',
});

/** @deprecated Use RECOMMENDED_SYSTEM_HELP — kept for API field name manualNextStep. */
const MANUAL_NEXT_STEP = RECOMMENDED_SYSTEM_HELP;

function asDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function stuckSinceAt(row) {
  switch (row.blocking_step) {
    case 'schema_no_child_login':
      return asDate(row.schema_saved_at) || asDate(row.created_at);
    case 'login_no_completion':
      return asDate(row.child_access_completed_at) || asDate(row.created_at);
    case 'completion_no_return':
      return asDate(row.first_completion_at) || asDate(row.created_at);
    case 'core_flow_errors':
      return asDate(row.last_event_at) || asDate(row.created_at);
    default:
      return asDate(row.created_at);
  }
}

function hoursBetween(from, now) {
  const start = asDate(from);
  if (!start) return null;
  return Math.max(0, Math.round((now.getTime() - start.getTime()) / 3600000));
}

function whyStuck(row) {
  if (row.blocking_step === 'onboarding_incomplete' && !row.last_event_type) {
    return WHY_STUCK.onboarding_incomplete_never_started;
  }
  return WHY_STUCK[row.blocking_step] || 'Okänt blockerande steg — manuell genomgång.';
}

function lastActivity(row) {
  const eventAt = asDate(row.last_event_at);
  const loginAt = asDate(row.last_login_at);
  if (loginAt && (!eventAt || loginAt > eventAt)) {
    return { type: 'login', at: row.last_login_at };
  }
  if (eventAt) {
    return { type: row.last_event_type || null, at: row.last_event_at };
  }
  return { type: null, at: null };
}

/**
 * @param {object} row SQL row from growth stuck cohort query
 * @param {Date} [now]
 */
function mapGrowthStuckFamily(row, now = new Date()) {
  const stuckAt = stuckSinceAt(row);
  const activity = lastActivity(row);
  return {
    familyId: row.family_id,
    familyName: row.family_name,
    createdAt: row.created_at,
    locale: row.locale || null,
    platform: row.acquisition_platform || null,
    blockingStep: row.blocking_step,
    whyStuck: whyStuck(row),
    stuckSinceAt: stuckAt ? stuckAt.toISOString() : null,
    stuckHours: hoursBetween(stuckAt, now),
    lastEventType: row.last_event_type || null,
    lastEventAt: row.last_event_at || null,
    lastLoginAt: row.last_login_at || null,
    lastActivityType: activity.type,
    lastActivityAt: activity.at,
    acquisition: {
      source: row.acquisition_source || null,
      medium: row.acquisition_medium || null,
      campaign: row.acquisition_campaign || null,
      referralCode: row.acquisition_referral_code || null,
    },
    milestones: {
      childCreatedAt: row.child_created_at,
      schemaSavedAt: row.schema_saved_at,
      childAccessAt: row.child_access_completed_at,
      firstCompletionAt: row.first_completion_at,
      p0ActivatedAt: row.p0_activated_at,
    },
    recommendedFollowUp: FOLLOW_UP[row.blocking_step] || 'preview_manual_review',
    recommendedSystemHelp: RECOMMENDED_SYSTEM_HELP[row.blocking_step] || 'Systemhjälp: manuell genomgång i appen.',
    manualNextStep: RECOMMENDED_SYSTEM_HELP[row.blocking_step] || 'Systemhjälp: manuell genomgång i appen.',
    autoSendAllowed: false,
    commsHistory: {
      activationNudgeSentAt: row.activation_nudge_sent_at || null,
      lastStuckIntervention: null,
    },
  };
}

module.exports = {
  COHORTS,
  FOLLOW_UP,
  WHY_STUCK,
  RECOMMENDED_SYSTEM_HELP,
  MANUAL_NEXT_STEP,
  stuckSinceAt,
  mapGrowthStuckFamily,
};
