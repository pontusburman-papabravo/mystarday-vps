/**
 * db/notification-log.js
 * Owns: notification_log table — per-parent push notification archive.
 * Does NOT own: push subscription management (push_subscriptions), system messages (system_messages).
 */

const db = require('../src/lib/db');

/**
 * Save a notification to the archive for a parent.
 * Called from push-notifications.js after each send.
 *
 * @param {string} parentId
 * @param {{ title: string, body: string, type?: string, url?: string, metadata?: object }} payload
 * @returns {Promise<object>} the created row
 */
async function logNotification(parentId, { title, body, type = 'general', url = null, metadata = {} }) {
  const result = await db.query(
    `INSERT INTO notification_log (parent_id, title, body, type, url, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING *`,
    [parentId, title, body || '', type, url, JSON.stringify(metadata || {})]
  );
  return result.rows[0];
}

/**
 * Get all notifications for a parent, newest first, within the last 7 days.
 *
 * @param {string} parentId
 * @returns {Promise<object[]>}
 */
async function getNotifications(parentId) {
  const result = await db.query(
    `SELECT id, title, body, type, url, is_read, created_at
     FROM notification_log
     WHERE parent_id = $1
       AND created_at > NOW() - INTERVAL '7 days'
     ORDER BY created_at DESC`,
    [parentId]
  );
  return result.rows;
}

/**
 * Count unread notifications for a parent (last 7 days).
 *
 * @param {string} parentId
 * @returns {Promise<number>}
 */
async function countUnread(parentId) {
  const result = await db.query(
    `SELECT COUNT(*) AS count
     FROM notification_log
     WHERE parent_id = $1
       AND is_read = false
       AND created_at > NOW() - INTERVAL '7 days'`,
    [parentId]
  );
  return parseInt(result.rows[0].count, 10);
}

/**
 * Mark a single notification as read — ownership-gated.
 *
 * @param {string} notificationId
 * @param {string} parentId
 * @returns {Promise<boolean>} true if updated
 */
async function markAsRead(notificationId, parentId) {
  const result = await db.query(
    `UPDATE notification_log
     SET is_read = true
     WHERE id = $1 AND parent_id = $2`,
    [notificationId, parentId]
  );
  return result.rowCount > 0;
}

/**
 * Mark all notifications as read for a parent.
 *
 * @param {string} parentId
 * @returns {Promise<number>} rows updated
 */
async function markAllAsRead(parentId) {
  const result = await db.query(
    `UPDATE notification_log
     SET is_read = true
     WHERE parent_id = $1 AND is_read = false`,
    [parentId]
  );
  return result.rowCount;
}

/**
 * Delete notifications older than 7 days.
 * Called by the cleanup scheduler.
 *
 * @returns {Promise<number>} rows deleted
 */
async function pruneOldNotifications() {
  const result = await db.query(
    `DELETE FROM notification_log
     WHERE created_at < NOW() - INTERVAL '7 days'`
  );
  return result.rowCount;
}

module.exports = {
  logNotification,
  getNotifications,
  countUnread,
  markAsRead,
  markAllAsRead,
  pruneOldNotifications,
};
