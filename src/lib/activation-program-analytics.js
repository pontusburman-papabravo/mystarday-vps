/**
 * Activation program analytics — fire-and-forget wrappers (Fas 3+).
 */

const analytics = require('../../db/analytics');

function track(familyId, eventType, metadata = {}) {
  if (!familyId) return;
  analytics.track(familyId, eventType, metadata);
}

function trackFirstBannerSeen(familyId, effectiveDay, hoursSinceEnroll) {
  track(familyId, 'activation_program_first_banner_seen', {
    effective_day: effectiveDay,
    hours_since_enroll: hoursSinceEnroll,
  });
}

function trackCtaClicked(familyId, day, ctaType, destination) {
  track(familyId, 'activation_program_cta_clicked', {
    day,
    cta_type: ctaType,
    destination: destination || null,
  });
}

function trackDayDone(familyId, day, trigger, auto = true) {
  track(familyId, 'activation_program_day_done', { day, auto, trigger });
}

function trackProgramCompleted(familyId, reflectionScore) {
  track(familyId, 'activation_program_completed', { reflection_score: reflectionScore });
}

function trackChildViewOpened(familyId, childId, source) {
  track(familyId, 'child_view_opened', { child_id: childId, source });
}

function trackDaySkipped(familyId, day) {
  track(familyId, 'activation_program_day_skipped', { day });
}

function trackOptedOut(familyId, day) {
  track(familyId, 'activation_program_opted_out', { day });
}

function trackDaySolo(familyId, day) {
  track(familyId, 'activation_program_day_solo', { day });
}

function trackProgramStarted(familyId, cohortArm, programType, enrollSource) {
  track(familyId, 'activation_program_started', {
    cohort_arm: cohortArm,
    program_type: programType,
    enroll_source: enrollSource || null,
  });
}

function trackEnrollChoice(familyId, { choice, enrollSource, ctaVariant }) {
  track(familyId, 'activation_program_enroll_choice', {
    choice,
    enroll_source: enrollSource,
    cta_variant: ctaVariant || 'help_us_week_one',
    direct_cta: choice === 'direct' ? 'we_run_ourselves' : null,
  });
}

function trackEmailInviteSent(familyId, parentId) {
  track(familyId, 'activation_program_email_invite_sent', {
    parent_id: String(parentId),
  });
}

function trackEmailInviteClicked(familyId, parentId) {
  track(familyId, 'activation_program_email_invite_clicked', {
    parent_id: String(parentId),
  });
}

function trackPushSent(familyId, day) {
  track(familyId, 'activation_program_push_sent', { day });
}

function trackPushClicked(familyId, day) {
  track(familyId, 'activation_program_push_clicked', { day });
}

module.exports = {
  trackFirstBannerSeen,
  trackCtaClicked,
  trackDayDone,
  trackProgramCompleted,
  trackChildViewOpened,
  trackDaySkipped,
  trackOptedOut,
  trackDaySolo,
  trackProgramStarted,
  trackEnrollChoice,
  trackEmailInviteSent,
  trackEmailInviteClicked,
  trackPushSent,
  trackPushClicked,
};
