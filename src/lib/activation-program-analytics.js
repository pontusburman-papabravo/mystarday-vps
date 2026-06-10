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

module.exports = {
  trackFirstBannerSeen,
  trackCtaClicked,
  trackDayDone,
  trackProgramCompleted,
  trackChildViewOpened,
  trackDaySkipped,
  trackOptedOut,
  trackDaySolo,
};
