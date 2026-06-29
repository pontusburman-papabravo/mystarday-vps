const { loadEnvFile, sanitizeEnvValue } = require('./src/lib/load-env');
loadEnvFile(undefined, { override: true });
if (process.env.ACTIVATION_PROGRAM_LAUNCH_AT) {
  process.env.ACTIVATION_PROGRAM_LAUNCH_AT = sanitizeEnvValue(
    process.env.ACTIVATION_PROGRAM_LAUNCH_AT
  );
}

const logger = require('./src/lib/logger');
const { startMidnightScheduler, stopMidnightScheduler } = require('./src/lib/midnight-scheduler');
const { startDeletionScheduler, stopDeletionScheduler } = require('./src/lib/deletion-scheduler');
const { startWeeklySummaryScheduler, stopWeeklySummaryScheduler } = require('./src/lib/weekly-summary-scheduler');
const { startLibraryNotificationScheduler, stopLibraryNotificationScheduler } = require('./src/lib/library-notifications');
const { startNyhetScheduler, stopNyhetScheduler } = require('./src/lib/nyhet-scheduler');
const { startPushReminderScheduler, stopPushReminderScheduler } = require('./src/lib/push-reminder-scheduler');
const {
  startActivationPushScheduler,
  stopActivationPushScheduler,
} = require('./src/lib/activation-program-scheduler');
const {
  startActivationNudgeScheduler,
  stopActivationNudgeScheduler,
} = require('./src/lib/activation-nudge-scheduler');
const {
  startChildHandoffReminderScheduler,
  stopChildHandoffReminderScheduler,
} = require('./src/lib/child-handoff-reminder-scheduler');
const {
  startCustodyHandoffScheduler,
  stopCustodyHandoffScheduler,
} = require('./src/lib/custody-handoff-scheduler');
const {
  startRetentionReengagementScheduler,
  stopRetentionReengagementScheduler,
} = require('./src/lib/retention-reengagement-scheduler');
const {
  startActivationAdvisorScheduler,
  stopActivationAdvisorScheduler,
} = require('./src/lib/activation-advisor-scheduler');
const {
  startJourneyPushScheduler,
  stopJourneyPushScheduler,
} = require('./src/lib/journey-push-scheduler');
const {
  startJourneyDailyAnalysisScheduler,
  stopJourneyDailyAnalysisScheduler,
} = require('./src/lib/journey-daily-analysis-scheduler');
const { pool } = require('./src/lib/db');
const { createApp } = require('./app');

const app = createApp();
const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  logger.info({ msg: 'Server started', operation: 'server.start', port });
  startMidnightScheduler();
  startDeletionScheduler();
  startWeeklySummaryScheduler();
  startLibraryNotificationScheduler();
  startNyhetScheduler();
  startPushReminderScheduler();
  startActivationPushScheduler();
  startActivationNudgeScheduler();
  startChildHandoffReminderScheduler();
  startCustodyHandoffScheduler();
  startRetentionReengagementScheduler();
  startActivationAdvisorScheduler();
  startJourneyPushScheduler();
  startJourneyDailyAnalysisScheduler();
});

function onTermSignal(signal) {
  logger.info({ msg: 'Termination signal received', operation: 'server.shutdown', signal });
  stopMidnightScheduler(); stopDeletionScheduler(); stopWeeklySummaryScheduler(); stopLibraryNotificationScheduler(); stopNyhetScheduler(); stopPushReminderScheduler(); stopActivationPushScheduler(); stopActivationNudgeScheduler(); stopChildHandoffReminderScheduler(); stopCustodyHandoffScheduler(); stopRetentionReengagementScheduler(); stopActivationAdvisorScheduler(); stopJourneyPushScheduler(); stopJourneyDailyAnalysisScheduler();
  server.close(() => {
    pool.end()
      .then(() => {
        logger.info({ msg: 'Database pool closed', operation: 'server.shutdown.pool_close' });
        process.exit(0);
      })
      .catch((err) => {
        logger.error({ msg: 'Pool close error', operation: 'server.shutdown.pool_error', error: err.message }, err);
        process.exit(1);
      });
  });
  setTimeout(() => {
    logger.error({ msg: 'Forced exit after 10s', operation: 'server.shutdown.timeout' });
    process.exit(1);
  }, 10000).unref();
}
process.on('SIGTERM', () => onTermSignal('SIGTERM')); process.on('SIGINT', () => onTermSignal('SIGINT'));
