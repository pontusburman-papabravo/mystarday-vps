/**
 * Waitlist DB operations.
 * Owns: waitlist table queries.
 * Does NOT own: API, email sending.
 */
const { query } = require('../src/lib/db');

/**
 * Insert a new waitlist signup. Idempotent — upserts on email conflict.
 * @param {string} name
 * @param {string} email
 * @param {string|null} utmSource
 * @param {string|null} ipAddress
 * @returns {Promise<{id: number, is_new: boolean}>}
 */
async function addWaitlistEntry(name, email, utmSource = null, ipAddress = null) {
  const sql = `
    INSERT INTO waitlist (name, email, utm_source, ip_address)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (email) DO UPDATE SET
      name = EXCLUDED.name,
      ip_address = COALESCE(EXCLUDED.ip_address, waitlist.ip_address),
      utm_source = COALESCE(EXCLUDED.utm_source, waitlist.utm_source)
    RETURNING id, (xmax = 0) AS is_new
  `;
  const result = await query(sql, [name.trim(), email.toLowerCase().trim(), utmSource, ipAddress]);
  return result.rows[0];
}

/**
 * Update survey responses for an existing waitlist entry by email.
 * @param {string} email
 * @param {string[]} painPoints - array of pain point values
 * @param {string|null} painPointsOther - free text for "other" option
 * @param {string|null} currentMethod - selected method
 * @returns {Promise<boolean>} - true if updated, false if not found
 */
async function updateWaitlistSurvey(email, painPoints, painPointsOther, currentMethod, countryCode = null) {
  const sql = `
    UPDATE waitlist
    SET
      pain_points = $2,
      pain_points_other = $3,
      current_method = $4,
      country_code = $5,
      survey_completed_at = NOW()
    WHERE email = $1
    RETURNING id
  `;
  const result = await query(sql, [
    email.toLowerCase().trim(),
    painPoints || [],
    painPointsOther || null,
    currentMethod || null,
    countryCode || null,
  ]);
  return result.rowCount > 0;
}

/**
 * Mark a waitlist entry as skipped (survey not filled out).
 * @param {string} email
 */
async function markWaitlistSkipped(email) {
  const sql = `
    UPDATE waitlist
    SET survey_skipped_at = NOW()
    WHERE email = $1 AND survey_completed_at IS NULL AND survey_skipped_at IS NULL
    RETURNING id
  `;
  await query(sql, [email.toLowerCase().trim()]);
}

/**
 * List all waitlist entries for admin panel.
 * @param {{ limit: number, offset: number, search: string|null }} opts
 * @returns {{ rows: object[], total: number }}
 */
async function listWaitlistEntries({ limit = 50, offset = 0, search = null } = {}) {
  let countSql = 'SELECT COUNT(*) as total FROM waitlist';
  let dataSql = `
    SELECT id, name, email, created_at,
           pain_points, pain_points_other, current_method, country_code,
           survey_completed_at, survey_skipped_at,
           CASE
             WHEN survey_completed_at IS NOT NULL THEN 'completed'
             WHEN survey_skipped_at IS NOT NULL THEN 'skipped'
             ELSE 'pending'
           END as survey_status
    FROM waitlist
  `;
  const params = [];
  if (search && search.trim().length > 0) {
    const searchFilter = ` WHERE name ILIKE $1 OR email ILIKE $1`;
    countSql += searchFilter;
    dataSql += searchFilter;
    params.push(`%${search.trim()}%`);
  }
  dataSql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const [countResult, dataResult] = await Promise.all([
    query(countSql, params.slice(0, search ? 1 : 0)),
    query(dataSql, params),
  ]);
  return { rows: dataResult.rows, total: parseInt(countResult.rows[0].total, 10) };
}

/**
 * Get waitlist statistics for admin panel.
 * @returns {{ total: number, completed: number, skipped: number, pending: number, q1: object[], q2: object[], q3: object[] }}
 */
async function getWaitlistStats() {
  const [totalsResult, q1Result, q2Result, q3Result] = await Promise.all([
    query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE survey_completed_at IS NOT NULL) as completed,
        COUNT(*) FILTER (WHERE survey_skipped_at IS NOT NULL) as skipped,
        COUNT(*) FILTER (WHERE survey_completed_at IS NULL AND survey_skipped_at IS NULL) as pending
      FROM waitlist
    `),
    query(`
      SELECT unnest(pain_points) as value, COUNT(*) as count
      FROM waitlist
      WHERE survey_completed_at IS NOT NULL AND pain_points IS NOT NULL AND array_length(pain_points, 1) > 0
      GROUP BY unnest(pain_points)
      ORDER BY count DESC
    `),
    query(`
      SELECT current_method as value, COUNT(*) as count
      FROM waitlist
      WHERE survey_completed_at IS NOT NULL AND current_method IS NOT NULL
      GROUP BY current_method
      ORDER BY count DESC
    `),
    query(`
      SELECT country_code as value, COUNT(*) as count
      FROM waitlist
      WHERE survey_completed_at IS NOT NULL AND country_code IS NOT NULL
      GROUP BY country_code
      ORDER BY count DESC
      LIMIT 20
    `),
  ]);
  return {
    total: parseInt(totalsResult.rows[0].total, 10),
    completed: parseInt(totalsResult.rows[0].completed, 10),
    skipped: parseInt(totalsResult.rows[0].skipped, 10),
    pending: parseInt(totalsResult.rows[0].pending, 10),
    q1: q1Result.rows,
    q2: q2Result.rows,
    q3: q3Result.rows,
  };
}

/**
 * Delete a waitlist entry by id.
 * @param {number} id
 * @returns {Promise<boolean>}
 */
async function deleteWaitlistEntry(id) {
  const result = await query('DELETE FROM waitlist WHERE id = $1', [id]);
  return result.rowCount > 0;
}

module.exports = { addWaitlistEntry, updateWaitlistSurvey, markWaitlistSkipped, listWaitlistEntries, getWaitlistStats, deleteWaitlistEntry };