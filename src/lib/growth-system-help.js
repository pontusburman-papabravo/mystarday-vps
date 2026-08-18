'use strict';

/**
 * In-product system help for stuck families (48h–14d).
 * Contextual surfaces only — no global banners. One clear next step.
 */

const { isActivationFlagEnabled } = require('./activation-flags');
const { evaluateStuckFamily } = require('./growth-stuck-classifier');
const { FOLLOW_UP } = require('./growth-stuck-work-queue');
const helpDb = require('../../db/growth-system-help');
const analytics = require('../../db/analytics');

const FLAG_KEY = 'growth_system_help_v1';

const SURFACES = Object.freeze({
  help_panel: 'help_panel',
  child_handoff: 'child_handoff',
  child_login: 'child_login',
  onboarding: 'onboarding',
  schedule: 'schedule',
  dashboard: 'dashboard',
  daily_log: 'daily_log',
  settings_pin: 'settings_pin',
});

/** blocking_step → surfaces where help may appear (no new popups elsewhere). */
const SURFACE_BY_BLOCKING_STEP = Object.freeze({
  onboarding_incomplete: [
    SURFACES.onboarding,
    SURFACES.help_panel,
    SURFACES.dashboard,
    SURFACES.schedule,
  ],
  schema_no_child_login: [
    SURFACES.child_handoff,
    SURFACES.child_login,
    SURFACES.help_panel,
    SURFACES.onboarding,
  ],
  login_no_completion: [
    SURFACES.schedule,
    SURFACES.daily_log,
    SURFACES.help_panel,
    SURFACES.dashboard,
  ],
  completion_no_return: [
    SURFACES.dashboard,
    SURFACES.schedule,
    SURFACES.help_panel,
  ],
  core_flow_errors: [
    SURFACES.child_login,
    SURFACES.settings_pin,
    SURFACES.help_panel,
  ],
});

const CONTENT = Object.freeze({
  onboarding_incomplete: {
    headlineSv: 'Fortsätt där ni slutade',
    bodySv: 'Ni är nära — spara barnets schema så kan barnet börja samla stjärnor.',
    ctaSv: 'Fortsätt onboarding',
    ctaAction: 'open_onboarding',
    headlineEn: 'Pick up where you left off',
    bodyEn: 'You are close — save your child schedule so they can start earning stars.',
    ctaEn: 'Continue onboarding',
  },
  schema_no_child_login: {
    headlineSv: 'Hjälp barnet logga in',
    bodySv: 'Schemat är klart. Låt barnet logga in med namn och PIN på samma enhet.',
    ctaSv: 'Starta barninloggning',
    ctaAction: 'start_child_login',
    headlineEn: 'Help your child log in',
    bodyEn: 'The schedule is ready. Let your child log in with their name and PIN on this device.',
    ctaEn: 'Start child login',
  },
  login_no_completion: {
    headlineSv: 'Första stjärnan väntar',
    bodySv: 'Barnet har loggat in — öppna dagens schema och hjälp till första avklarade aktiviteten.',
    ctaSv: 'Öppna dagens schema',
    ctaAction: 'open_daily_log',
    headlineEn: 'The first star is waiting',
    bodyEn: 'Your child has logged in — open today schedule and help with the first completed activity.',
    ctaEn: 'Open today schedule',
  },
  completion_no_return: {
    headlineSv: 'Rutinen väntar',
    bodySv: 'Ni har kommit igång — kolla att schemat fortfarande stämmer och låt barnet logga in igen.',
    ctaSv: 'Visa schema',
    ctaAction: 'open_schedule',
    headlineEn: 'Your routine is waiting',
    bodyEn: 'You have started — check the schedule still fits and let your child log in again.',
    ctaEn: 'View schedule',
  },
  core_flow_errors: {
    headlineSv: 'Något gick fel',
    bodySv: 'Om PIN eller inloggning strular: kontrollera PIN under barnets profil, eller be om hjälp nedan.',
    ctaSv: 'Visa barnets PIN',
    ctaAction: 'open_child_profile',
    headlineEn: 'Something went wrong',
    bodyEn: 'If PIN or login fails: check PIN under the child profile, or request help below.',
    ctaEn: 'View child PIN',
    showSupportRequest: true,
  },
});

function isEnglish(locale) {
  return locale === 'en-GB' || locale === 'en';
}

function buildHelpPayload(blockingStep, locale) {
  const copy = CONTENT[blockingStep];
  if (!copy) return null;
  const en = isEnglish(locale);
  return {
    blockingStep,
    helpType: FOLLOW_UP[blockingStep] || 'system_help',
    headline: en ? copy.headlineEn : copy.headlineSv,
    body: en ? copy.bodyEn : copy.bodySv,
    ctaLabel: en ? copy.ctaEn : copy.ctaSv,
    ctaAction: copy.ctaAction,
    showSupportRequest: Boolean(copy.showSupportRequest),
    surfaces: SURFACE_BY_BLOCKING_STEP[blockingStep] || [SURFACES.help_panel],
  };
}

function computeProgressionOutcome(shownAt, milestoneAt) {
  if (!shownAt || !milestoneAt) return null;
  const shown = shownAt instanceof Date ? shownAt : new Date(shownAt);
  const milestone = milestoneAt instanceof Date ? milestoneAt : new Date(milestoneAt);
  const hours = (milestone.getTime() - shown.getTime()) / 3600000;
  if (hours < 0) return null;
  if (hours <= 24) return 'progressed_24h';
  if (hours <= 72) return 'progressed_72h';
  return null;
}

/**
 * @param {string} familyId
 * @param {{ surface?: string, locale?: string }} [opts]
 */
async function evaluateSystemHelp(familyId, opts = {}) {
  const enabled = await isActivationFlagEnabled(FLAG_KEY, familyId);
  if (!enabled) {
    return { eligible: false, reason: 'flag_off' };
  }

  const facts = await helpDb.loadFamilyStuckFacts(familyId);
  if (!facts) {
    return { eligible: false, reason: 'family_not_found' };
  }

  const stuck = evaluateStuckFamily(facts);
  if (!stuck.blockingStep) {
    return { eligible: false, reason: stuck.inWindow ? 'not_stuck' : 'outside_window' };
  }

  const surface = opts.surface || SURFACES.help_panel;
  const allowedSurfaces = SURFACE_BY_BLOCKING_STEP[stuck.blockingStep] || [];
  if (!allowedSurfaces.includes(surface)) {
    return { eligible: false, reason: 'wrong_surface', blockingStep: stuck.blockingStep };
  }

  const locale = opts.locale || facts.locale || 'sv-SE';
  const help = buildHelpPayload(stuck.blockingStep, locale);
  if (!help) {
    return { eligible: false, reason: 'no_content' };
  }

  const helpType = help.helpType;
  const stuckDetectedAt = stuck.stuckSinceAt || new Date();
  await helpDb.upsertDetected(familyId, stuck.blockingStep, helpType, stuckDetectedAt);

  return {
    eligible: true,
    reason: 'stuck',
    blockingStep: stuck.blockingStep,
    stuckSinceAt: stuckDetectedAt.toISOString(),
    help,
  };
}

async function recordShown(familyId, meta = {}) {
  const result = await helpDb.markShown(familyId);
  if (!result.row || !result.newlyShown) return result.row;
  analytics.track(familyId, 'system_help_shown', {
    blocking_step: result.row.blocking_step,
    help_type: result.row.help_type,
    surface: meta.surface || null,
  }).catch(() => {});
  return result.row;
}

async function recordEngaged(familyId, meta = {}) {
  const row = await helpDb.markEngaged(familyId);
  if (!row) return null;
  analytics.track(familyId, 'system_help_engaged', {
    blocking_step: row.blocking_step,
    help_type: row.help_type,
    surface: meta.surface || null,
    cta_action: meta.cta_action || null,
  }).catch(() => {});
  return row;
}

async function recordSupportRequested(familyId, meta = {}) {
  const row = await helpDb.markSupportRequested(familyId);
  if (!row) return null;
  analytics.track(familyId, 'system_help_support_requested', {
    blocking_step: row.blocking_step,
    help_type: row.help_type,
    surface: meta.surface || null,
  }).catch(() => {});
  return row;
}

/**
 * Call when family clears a stuck blocking step (milestone progression).
 * @param {string} familyId
 * @param {Date} [milestoneAt]
 */
async function maybeRecordProgression(familyId, milestoneAt = new Date()) {
  const state = await helpDb.getState(familyId);
  if (!state || !state.system_help_shown_at) {
    return null;
  }
  if (state.next_milestone_at) {
    return null;
  }

  const facts = await helpDb.loadFamilyStuckFacts(familyId);
  if (!facts) return null;
  const stuck = evaluateStuckFamily(facts);
  if (stuck.blockingStep) {
    return null;
  }

  const outcome = computeProgressionOutcome(state.system_help_shown_at, milestoneAt);
  const row = await helpDb.markProgression(familyId, milestoneAt, outcome);
  if (row) {
    const hours = Math.round(
      (milestoneAt.getTime() - new Date(state.system_help_shown_at).getTime()) / 3600000
    );
    analytics.track(familyId, 'system_help_progressed', {
      blocking_step: row.blocking_step,
      help_type: row.help_type,
      outcome: row.progression_outcome || (outcome ? outcome : 'progressed_after_72h'),
      hours_to_milestone: hours,
    }).catch(() => {});
  }
  return row;
}

/**
 * Scheduler hook — mark families with no progression only after full 72h window
 * and only while still stuck on the same blocking step.
 */
async function finalizeNoProgressOutcomes(now = new Date()) {
  const cutoff = new Date(now.getTime() - 72 * 60 * 60 * 1000);
  const candidates = await helpDb.listPendingNoProgressCandidates(cutoff);
  let count = 0;
  for (const candidate of candidates) {
    const facts = await helpDb.loadFamilyStuckFacts(candidate.family_id);
    if (!facts) continue;
    const stuck = evaluateStuckFamily(facts, now);
    if (!stuck.blockingStep) continue;
    const row = await helpDb.markNoProgress(candidate.family_id);
    if (!row) continue;
    analytics.track(row.family_id, 'system_help_progressed', {
      blocking_step: row.blocking_step,
      help_type: row.help_type,
      outcome: 'no_progress',
    }).catch(() => {});
    count += 1;
  }
  return count;
}

module.exports = {
  FLAG_KEY,
  SURFACES,
  SURFACE_BY_BLOCKING_STEP,
  CONTENT,
  buildHelpPayload,
  evaluateSystemHelp,
  recordShown,
  recordEngaged,
  recordSupportRequested,
  maybeRecordProgression,
  finalizeNoProgressOutcomes,
  computeProgressionOutcome,
};
