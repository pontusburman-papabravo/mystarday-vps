'use strict';

/**
 * Parse push_preferences for schedule-reminder sending.
 * Defaults match parent settings UI (opt-out, not opt-in).
 */
function parseScheduleReminderPrefs(rawPrefs) {
  const r = rawPrefs || {};
  return {
    enabled: r.enabled !== false,
    schedule_reminder: r.schedule_reminder !== false,
    reminder_lead_minutes: r.reminder_lead_minutes ?? 10,
    per_child: r.per_child || {},
  };
}

/** Whether schedule reminders should run for this parent+child pair. */
function isScheduleReminderEnabled(prefs, childId) {
  if (!prefs.enabled || prefs.schedule_reminder === false) return false;
  const childPrefs = prefs.per_child?.[childId];
  if (childPrefs?.schedule_reminder === false) return false;
  return true;
}

/**
 * Per-child notification toggle with global fallback.
 * Used by inactivity, star-milestone, and backfill reminder paths.
 */
function isChildNotificationEnabled(prefs, childId, type) {
  const childPrefs = prefs.per_child?.[childId];
  if (childPrefs && typeof childPrefs === 'object') {
    if (childPrefs[type] === false) return false;
    if (childPrefs[type] === true) return true;
  }
  const globalToggle = {
    schedule_reminder: prefs.schedule_reminder,
    inactivity_nudge: prefs.inactivity_nudge,
    star_milestone: prefs.star_milestone,
    backfill_reminder: prefs.backfill_reminder,
  };
  return globalToggle[type] !== false;
}

module.exports = {
  parseScheduleReminderPrefs,
  isScheduleReminderEnabled,
  isChildNotificationEnabled,
};
