'use strict';

/**
 * Canonical list of in-process schedulers started from server.js.
 * Contract tests assert server.js stays in sync with this registry.
 */
const {
  MIDNIGHT_SCHEDULER_LOCK_ID,
  DELETION_SCHEDULER_LOCK_ID,
  WEEKLY_SUMMARY_SCHEDULER_LOCK_ID,
  NYHET_SCHEDULER_LOCK_ID,
  LIBRARY_NOTIFICATION_SCHEDULER_LOCK_ID,
  PUSH_REMINDER_SCHEDULER_LOCK_ID,
  CUSTODY_HANDOFF_SCHEDULER_LOCK_ID,
  RETENTION_REENGAGEMENT_LOCK_ID,
  ACTIVATION_ADVISOR_LOCK_ID,
  JOURNEY_DAILY_ANALYSIS_LOCK_ID,
  ACTIVATION_NUDGE_LOCK_ID,
  JOURNEY_PUSH_LOCK_ID,
  CHILD_HANDOFF_REMINDER_LOCK_ID,
  ACTIVATION_PROGRAM_SCHEDULER_LOCK_ID,
} = require('./scheduler-constants');

/** @type {Array<{ id: string, start: string, stop: string, advisoryLockId?: number }>} */
const SCHEDULER_REGISTRY = [
  { id: 'midnight', start: 'startMidnightScheduler', stop: 'stopMidnightScheduler', advisoryLockId: MIDNIGHT_SCHEDULER_LOCK_ID },
  { id: 'deletion', start: 'startDeletionScheduler', stop: 'stopDeletionScheduler', advisoryLockId: DELETION_SCHEDULER_LOCK_ID },
  { id: 'weekly-summary', start: 'startWeeklySummaryScheduler', stop: 'stopWeeklySummaryScheduler', advisoryLockId: WEEKLY_SUMMARY_SCHEDULER_LOCK_ID },
  { id: 'library-notifications', start: 'startLibraryNotificationScheduler', stop: 'stopLibraryNotificationScheduler', advisoryLockId: LIBRARY_NOTIFICATION_SCHEDULER_LOCK_ID },
  { id: 'nyhet', start: 'startNyhetScheduler', stop: 'stopNyhetScheduler', advisoryLockId: NYHET_SCHEDULER_LOCK_ID },
  { id: 'push-reminder', start: 'startPushReminderScheduler', stop: 'stopPushReminderScheduler', advisoryLockId: PUSH_REMINDER_SCHEDULER_LOCK_ID },
  { id: 'activation-push', start: 'startActivationPushScheduler', stop: 'stopActivationPushScheduler', advisoryLockId: ACTIVATION_PROGRAM_SCHEDULER_LOCK_ID },
  { id: 'activation-nudge', start: 'startActivationNudgeScheduler', stop: 'stopActivationNudgeScheduler', advisoryLockId: ACTIVATION_NUDGE_LOCK_ID },
  { id: 'child-handoff-reminder', start: 'startChildHandoffReminderScheduler', stop: 'stopChildHandoffReminderScheduler', advisoryLockId: CHILD_HANDOFF_REMINDER_LOCK_ID },
  { id: 'custody-handoff', start: 'startCustodyHandoffScheduler', stop: 'stopCustodyHandoffScheduler', advisoryLockId: CUSTODY_HANDOFF_SCHEDULER_LOCK_ID },
  { id: 'retention-reengagement', start: 'startRetentionReengagementScheduler', stop: 'stopRetentionReengagementScheduler', advisoryLockId: RETENTION_REENGAGEMENT_LOCK_ID },
  { id: 'activation-advisor', start: 'startActivationAdvisorScheduler', stop: 'stopActivationAdvisorScheduler', advisoryLockId: ACTIVATION_ADVISOR_LOCK_ID },
  { id: 'journey-push', start: 'startJourneyPushScheduler', stop: 'stopJourneyPushScheduler', advisoryLockId: JOURNEY_PUSH_LOCK_ID },
  { id: 'journey-daily-analysis', start: 'startJourneyDailyAnalysisScheduler', stop: 'stopJourneyDailyAnalysisScheduler', advisoryLockId: JOURNEY_DAILY_ANALYSIS_LOCK_ID },
];

module.exports = {
  SCHEDULER_REGISTRY,
};
