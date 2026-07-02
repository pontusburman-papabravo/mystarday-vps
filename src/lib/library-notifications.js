/**
 * src/lib/library-notifications.js
 * Owns: debounced push + in-app notifications when admin mutates the standard library.
 * Does NOT own: push subscription management, system_messages table schema, admin routes.
 *
 * Flow:
 *   1. Admin mutation calls notifyLibraryUpdate(kind, description).
 *   2. recordPendingUpdate() upserts a pending row in library_update_log,
 *      accumulating changes and extending the 10-minute debounce window.
 *   3. A 30-second interval (startLibraryNotificationScheduler) flushes rows
 *      whose flush_after has passed:
 *        a. Sends push to all subscribed parents.
 *        b. Creates a system_message for every active family (in-app banner).
 *        c. Marks the row sent.
 */

const db = require('./db');
const { sendPushNotification } = require('./push-notifications');
const systemMessages = require('../../db/system-messages');
const libraryUpdateLog = require('../../db/library-update-log');
const { LIBRARY_NOTIFICATION_SCHEDULER_LOCK_ID } = require('./scheduler-constants');
const { withAdvisoryLock } = require('./scheduler-lock');

const FLUSH_INTERVAL_MS = 30 * 1000; // check every 30 seconds

let _timer = null;

// Human-readable kind labels (Swedish)
const KIND_LABELS = {
  activity: 'aktiviteter',
  reward:   'belöningar',
  schedule: 'scheman',
};

/**
 * Record a pending library update for the given kind.
 * Fire-and-forget: never throws to the calling route.
 *
 * @param {'activity'|'reward'|'schedule'} kind
 * @param {string} description — short Swedish description of what changed
 */
function notifyLibraryUpdate(kind, description) {
  libraryUpdateLog.recordPendingUpdate(kind, description).catch((err) => {
    console.error('[LIBRARY-NOTIFY] Failed to record pending update:', err.message);
  });
}

/**
 * Flush all pending notifications whose debounce window has passed.
 * Called by the scheduler interval.
 */
async function flushPendingNotifications() {
  let pending;
  try {
    pending = await libraryUpdateLog.getPendingDue();
  } catch (err) {
    console.error('[LIBRARY-NOTIFY] Failed to query pending notifications:', err.message);
    return;
  }

  if (pending.length === 0) return;

  for (const row of pending) {
    try {
      await sendNotificationBatch(row);
      await libraryUpdateLog.markSent(row.id);
    } catch (err) {
      console.error(`[LIBRARY-NOTIFY] Failed to flush notification id=${row.id}:`, err.message);
      // Don't markSent — will retry on next flush tick
    }
  }
}

/**
 * Send push + system_message for a single pending batch row.
 *
 * @param {{ id: number, kind: string, change_count: number, sample_description: string }} row
 */
async function sendNotificationBatch(row) {
  const kindLabel = KIND_LABELS[row.kind] || row.kind;
  const countNote = row.change_count > 1 ? ` (${row.change_count} ändringar)` : '';
  const title = '📚 Stjärndag uppdaterat';
  const body = `${row.sample_description}${countNote}`;
  const url = '/library';

  // --- Push notifications to all subscribed parents ---
  let subscribedParents;
  try {
    const result = await db.query('SELECT DISTINCT parent_id FROM push_subscriptions');
    subscribedParents = result.rows;
  } catch (err) {
    console.error('[LIBRARY-NOTIFY] Failed to query push_subscriptions:', err.message);
    subscribedParents = [];
  }

  let totalPushSent = 0;
  for (const { parent_id } of subscribedParents) {
    try {
      const r = await sendPushNotification(parent_id, { title, body, icon: '/icon-192.png', url });
      totalPushSent += r.sent;
    } catch (err) {
      // Non-fatal: continue to next parent
      console.error('[LIBRARY-NOTIFY] Push failed for parent', parent_id, ':', err.message);
    }
  }

  // --- In-app system_message for all active families ---
  // Message includes a link hint (parsed by the banner on the frontend).
  const inAppMessage = `📚 Standardbiblioteket har uppdaterats — kolla in nya ${kindLabel}! |link:/library`;

  let families;
  try {
    const result = await db.query('SELECT id FROM family WHERE archived_at IS NULL');
    families = result.rows;
  } catch (err) {
    console.error('[LIBRARY-NOTIFY] Failed to query families:', err.message);
    families = [];
  }

  for (const { id: familyId } of families) {
    try {
      await systemMessages.createSystemMessage(familyId, inAppMessage);
    } catch (err) {
      console.error('[LIBRARY-NOTIFY] Failed to create system_message for family', familyId, ':', err.message);
    }
  }

  console.log(
    `[LIBRARY-NOTIFY] Flushed kind=${row.kind} count=${row.change_count}` +
    ` push_sent=${totalPushSent} families_notified=${families.length}`
  );
}

/**
 * Start the library notification flush scheduler.
 * Call once at server startup alongside other schedulers.
 */
function startLibraryNotificationScheduler() {
  _timer = setInterval(async () => {
    const outcome = await withAdvisoryLock(LIBRARY_NOTIFICATION_SCHEDULER_LOCK_ID, async () => {
      await flushPendingNotifications();
    });
    if (outcome?.skipped === 'lock') {
      console.log('[LIBRARY-NOTIFY] Skipping — another instance holds the lock');
    }
  }, FLUSH_INTERVAL_MS);

  // Don't block process exit
  if (_timer.unref) _timer.unref();

  console.log('[LIBRARY-NOTIFY] Scheduler started (flush every 30s)');
}

/**
 * Stop the scheduler (for graceful shutdown).
 */
function stopLibraryNotificationScheduler() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}

module.exports = {
  notifyLibraryUpdate,
  startLibraryNotificationScheduler,
  stopLibraryNotificationScheduler,
};
