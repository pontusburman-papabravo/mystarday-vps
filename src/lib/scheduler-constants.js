/**
 * Scheduler constants — advisory lock IDs and shared config.
 *
 * All PostgreSQL advisory lock IDs must be declared here to prevent collisions
 * if the app is horizontally scaled to 2+ instances.
 *
 * pg_advisory_lock takes an int64. Using small positive integers keeps IDs readable.
 * Range 1001–1999 reserved for scheduler locks (no overlap with any other DB locks).
 */

/** Midnight scheduler — daily log generation, notification pruning, analytics snapshot */
const MIDNIGHT_SCHEDULER_LOCK_ID = 1001;

/** GDPR deletion scheduler — cascade deletes after 30-day grace period */
const DELETION_SCHEDULER_LOCK_ID = 1002;

/** Weekly summary email scheduler — Sundays at 21:00 Europe/Stockholm */
const WEEKLY_SUMMARY_SCHEDULER_LOCK_ID = 1003;

/** Nyhet scheduler — auto-publish/unpublish dagens_nyhet rows every 60s */
const NYHET_SCHEDULER_LOCK_ID = 1004;

/** Library notification scheduler — debounced push + system_message flush every 30s */
const LIBRARY_NOTIFICATION_SCHEDULER_LOCK_ID = 1005;

/** Push reminder scheduler — sends contextual notifications every 5 minutes */
const PUSH_REMINDER_SCHEDULER_LOCK_ID = 1006;

/** Custody handoff eve reminders — ~18:00 Europe/Stockholm */
const CUSTODY_HANDOFF_SCHEDULER_LOCK_ID = 1008;

/** Win-back email scheduler — sends re-engagement emails to inactive families, Sundays 10:00 Stockholm */
const WIN_BACK_SCHEDULER_LOCK_ID = 1007;

/** RET-3 retention re-engagement push — day 3/7/14 for activated families */
const RETENTION_REENGAGEMENT_LOCK_ID = 1009;

/** Activation advisor — daily ops recommendations for admin Start page */
const ACTIVATION_ADVISOR_LOCK_ID = 1010;

module.exports = {
  MIDNIGHT_SCHEDULER_LOCK_ID,
  DELETION_SCHEDULER_LOCK_ID,
  WEEKLY_SUMMARY_SCHEDULER_LOCK_ID,
  NYHET_SCHEDULER_LOCK_ID,
  LIBRARY_NOTIFICATION_SCHEDULER_LOCK_ID,
  PUSH_REMINDER_SCHEDULER_LOCK_ID,
  WIN_BACK_SCHEDULER_LOCK_ID,
  CUSTODY_HANDOFF_SCHEDULER_LOCK_ID,
  RETENTION_REENGAGEMENT_LOCK_ID,
  ACTIVATION_ADVISOR_LOCK_ID,
};