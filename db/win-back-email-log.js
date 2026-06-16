/**
 * db/win-back-email-log.js
 * Owns: CRUD queries for win_back_email_log (approval-gated win-back emails).
 * Does NOT own: send logic, scheduler, template rendering.
 *
 * Status flow: pending_approval → approved → sent
 *               pending_approval → rejected
 */

const db = require('../src/lib/db');

/**
 * Insert a pending win-back email record for admin approval.
 * @param {object} p
 */
async function insertPending({ familyId, parentId, parentEmail, parentName, childId, childName, subject, body }) {
  const result = await db.query(
    `INSERT INTO win_back_email_log
       (family_id, parent_id, parent_email, parent_name, child_id, child_name, subject, body, status, email_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending_approval', 'win-back')
     RETURNING *`,
    [familyId, parentId, parentEmail || null, parentName || null, childId || null, childName, subject || null, body || null]
  );
  return result.rows[0];
}

/**
 * Get all records ordered by most recent first.
 * @param {{ status?: string, limit?: number }} opts
 */
async function getAll({ status, limit = 100 } = {}) {
  let sql = `
    SELECT
      wbel.id,
      wbel.family_id,
      wbel.parent_id,
      wbel.parent_email,
      wbel.parent_name,
      wbel.child_name,
      wbel.status,
      wbel.email_type,
      wbel.subject,
      wbel.body,
      wbel.sent_at,
      wbel.error,
      wbel.created_at,
      f.name AS family_name
    FROM win_back_email_log wbel
    LEFT JOIN family f ON f.id = wbel.family_id
  `;
  const params = [];
  if (status) {
    sql += ` WHERE wbel.status = $1`;
    params.push(status);
  }
  sql += ` ORDER BY wbel.created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);
  const result = await db.query(sql, params);
  return result.rows;
}

/**
 * Get pending records needing admin approval.
 */
async function getPending() {
  const result = await db.query(
    `SELECT
       wbel.*,
       f.name AS family_name
     FROM win_back_email_log wbel
     LEFT JOIN family f ON f.id = wbel.family_id
     WHERE wbel.status = 'pending_approval'
     ORDER BY wbel.created_at ASC
     LIMIT 50`
  );
  return result.rows;
}

/**
 * Approve a pending record and trigger send.
 * Returns the record so the caller can send it.
 */
async function approve(id) {
  const result = await db.query(
    `UPDATE win_back_email_log
       SET status = 'approved', error = NULL
     WHERE id = $1 AND status IN ('pending_approval', 'failed')
     RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Reject a pending record.
 */
async function reject(id) {
  const result = await db.query(
    `UPDATE win_back_email_log
       SET status = 'rejected'
     WHERE id = $1 AND status IN ('pending_approval', 'approved', 'failed')
     RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Mark a record as sent.
 */
async function markSent(id) {
  const result = await db.query(
    `UPDATE win_back_email_log
       SET status = 'sent', sent_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Mark a record as failed with error message.
 */
async function markFailed(id, error) {
  const result = await db.query(
    `UPDATE win_back_email_log
       SET status = 'failed', error = $2
     WHERE id = $1
     RETURNING *`,
    [id, error]
  );
  return result.rows[0] || null;
}

/**
 * Get records that have been pending_approval for over threshold hours.
 * Used by the auto-reject cron.
 * @param {number} hours
 */
async function getStalePending(hours = 48) {
  const safeHours = Math.max(1, Math.min(parseInt(hours, 10) || 48, 24 * 90));
  const result = await db.query(
    `SELECT wbel.*, f.name AS family_name
     FROM win_back_email_log wbel
     LEFT JOIN family f ON f.id = wbel.family_id
     WHERE wbel.status = 'pending_approval'
       AND wbel.created_at < NOW() - ($1::text || ' hours')::interval
     ORDER BY wbel.created_at ASC
     LIMIT 20`,
    [String(safeHours)]
  );
  return result.rows;
}

/**
 * Summary counts for the admin log page.
 */
async function getSummary() {
  const result = await db.query(`
    WITH counts AS (
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending_approval') AS pending_count,
        COUNT(*) FILTER (WHERE status = 'approved')        AS approved_count,
        COUNT(*) FILTER (WHERE status = 'sent')            AS sent_count,
        COUNT(*) FILTER (WHERE status = 'rejected')        AS rejected_count,
        COUNT(*) FILTER (WHERE status = 'failed')          AS failed_count,
        COUNT(*) FILTER (WHERE email_type = 'win-back' AND sent_at > NOW() - INTERVAL '7 days') AS sent_7d,
        COUNT(*) FILTER (WHERE email_type = 'win-back' AND sent_at > NOW() - INTERVAL '30 days') AS sent_30d,
        COUNT(*) FILTER (WHERE email_type = 'win-back')    AS total_win_back
      FROM win_back_email_log
    )
    SELECT * FROM counts
  `);
  return result.rows[0];
}

module.exports = {
  insertPending,
  getAll,
  getPending,
  approve,
  reject,
  markSent,
  markFailed,
  getStalePending,
  getSummary,
};