/**
 * Activation program analytics — fire-and-forget wrappers.
 */

const analytics = require('../../db/analytics');

function track(familyId, eventType, metadata = {}) {
  if (!familyId) return;
  analytics.track(familyId, eventType, metadata);
}

function trackProgramStarted(familyId, cohortArm, programType) {
  track(familyId, 'activation_program_started', { cohort_arm: cohortArm, program_type: programType });
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

function trackChildFirstCompletion(familyId, metadata) {
  track(familyId, 'child_first_completion', metadata);
}

function trackParentFirstCompletionSeen(familyId, metadata) {
  track(familyId, 'parent_first_completion_seen', metadata);
}

function trackAhaDismissed(familyId, dailyLogItemId) {
  track(familyId, 'parent_aha_moment_dismissed', { daily_log_item_id: dailyLogItemId });
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

module.exports = {
  trackProgramStarted,
  trackFirstBannerSeen,
  trackCtaClicked,
  trackDayDone,
  trackProgramCompleted,
  trackChildFirstCompletion,
  trackParentFirstCompletionSeen,
  trackAhaDismissed,
  trackChildViewOpened,
  trackDaySkipped,
  trackOptedOut,
  trackDaySolo,
};
