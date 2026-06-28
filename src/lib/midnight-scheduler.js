/**
 * Midnight scheduler for daily log generation.
 *
 * No external dependencies — uses setTimeout with self-rescheduling.
 * Fires just after UTC midnight each day to generate daily_log records
 * for all children whose local date just rolled over.
 *
 * On-demand fallback is handled in the GET /api/children/:childId/daily-log
 * route for any logs the scheduler may have missed.
 *
 * Uses pg_advisory_lock to prevent double-runs across horizontally scaled instances.
 */

const { generateLogsForAllChildren } = require('./daily-log-generator');
const { updateAllStreaks } = require('./streak-updater');
const db = require('./db');
const notificationLog = require('../../db/notification-log');
const analyticsDb = require('../../db/analytics');
const winBackLog = require('../../db/win-back-email-log');
const { getWinBackStaleHours } = require('./win-back-config');
const { MIDNIGHT_SCHEDULER_LOCK_ID } = require('./scheduler-constants');

let _timer = null;

/**
 * Milliseconds until the next UTC midnight.
 */
function msUntilMidnightUtc() {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 30  // 00:00:30 UTC — 30s buffer so all timezones have ticked over
  ));
  return Math.max(0, tomorrow.getTime() - now.getTime());
}

async function runMidnightJob() {
  const dateStr = new Date().toISOString().slice(0, 10);

  // Advisory lock prevents double-runs across horizontally scaled instances.
  // CRITICAL: lock + all jobs + unlock MUST run on the same dedicated connection.
  // Using pool.query() for advisory locks is a bug — the lock is connection-scoped,
  // so acquire/release on different pool connections provides zero protection.
  const client = await db.getClient();
  let lockAcquired = false;
  try {
    const { rows } = await client.query(
      'SELECT pg_try_advisory_lock($1) AS acquired', [MIDNIGHT_SCHEDULER_LOCK_ID]
    );
    lockAcquired = rows[0].acquired;

    if (!lockAcquired) {
      console.log(`[MIDNIGHT-SCHEDULER] Skipping — another instance holds the lock`);
      return;
    }

    console.log(`[MIDNIGHT-SCHEDULER] Running midnight job for ${dateStr}`);

    try {
      await generateLogsForAllChildren(dateStr);
    } catch (err) {
      console.error('[MIDNIGHT-SCHEDULER] Daily log job failed:', err.message);
    }

    // Update streaks: increment for children who completed at least one
    // activity yesterday, reset for those who had a gap
    try {
      await updateAllStreaks();
    } catch (err) {
      console.error('[MIDNIGHT-SCHEDULER] Streak update failed:', err.message);
    }

    // Prune notification_log rows older than 7 days
    try {
      const pruned = await notificationLog.pruneOldNotifications();
      if (pruned > 0) console.log(`[MIDNIGHT-SCHEDULER] Pruned ${pruned} old notifications`);
    } catch (err) {
      console.error('[MIDNIGHT-SCHEDULER] Notification prune failed:', err.message);
    }

    // Lock published pedagog notes whose calendar day has passed (family TZ)
    try {
      const { lockPublishedNotesPastDate } = require('./pedagog-note-lock');
      const locked = await lockPublishedNotesPastDate();
      if (locked > 0) console.log(`[MIDNIGHT-SCHEDULER] Locked ${locked} pedagog notes`);
    } catch (err) {
      console.error('[MIDNIGHT-SCHEDULER] Pedagog note lock failed:', err.message);
    }

    // Write analytics daily snapshot for yesterday
    try {
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      const kpis = await analyticsDb.computeLiveKpis();
      await analyticsDb.upsertDailySnapshot({ date: yesterdayStr, ...kpis });
      console.log(`[MIDNIGHT-SCHEDULER] Analytics snapshot written for ${yesterdayStr}`);
    } catch (err) {
      console.error('[MIDNIGHT-SCHEDULER] Analytics snapshot failed:', err.message);
    }

    // Auto-reject win-back email records pending longer than WIN_BACK_STALE_HOURS
    try {
      const staleHours = getWinBackStaleHours();
      const stale = await winBackLog.getStalePending(staleHours);
      if (stale.length > 0) {
        for (const record of stale) {
          await winBackLog.reject(record.id);
          console.log(`[MIDNIGHT-SCHEDULER] Auto-rejected stale win-back record ${record.id}`);
        }
        console.log(`[MIDNIGHT-SCHEDULER] Auto-rejected ${stale.length} stale win-back records`);
      }
    } catch (err) {
      console.error('[MIDNIGHT-SCHEDULER] Win-back auto-reject failed:', err.message);
    }

    try {
      const { runJourneyPhaseEvaluationJob } = require('./journey/established-routine');
      await runJourneyPhaseEvaluationJob();
    } catch (err) {
      console.error('[MIDNIGHT-SCHEDULER] Journey phase evaluation failed:', err.message);
    }
  } finally {
    if (lockAcquired) {
      await client.query('SELECT pg_advisory_unlock($1)', [MIDNIGHT_SCHEDULER_LOCK_ID]).catch(() => {});
    }
    client.release();
    scheduleNextRun();
  }
}

function scheduleNextRun() {
  const ms = msUntilMidnightUtc();
  console.log(`[MIDNIGHT-SCHEDULER] Next run in ${Math.round(ms / 60000)} minutes`);
  _timer = setTimeout(runMidnightJob, ms);
  // Prevent the timer from blocking Node.js process exit
  if (_timer.unref) _timer.unref();
}

/**
 * Start the midnight scheduler. Call once at server startup.
 */
function startMidnightScheduler() {
  scheduleNextRun();
  console.log('[MIDNIGHT-SCHEDULER] Scheduler started');
}

/**
 * Stop the scheduler (useful for tests / graceful shutdown).
 */
function stopMidnightScheduler() {
  if (_timer) {
    clearTimeout(_timer);
    _timer = null;
  }
}

module.exports = { startMidnightScheduler, stopMidnightScheduler };
