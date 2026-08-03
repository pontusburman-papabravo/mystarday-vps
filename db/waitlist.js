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
 * @param {object} [extra]
 * @returns {Promise<{id: number, is_new: boolean}>}
 */
async function addWaitlistEntry(name, email, utmSource = null, ipAddress = null, extra = {}) {
  const consentGiven = extra.marketing_consent === true;
  const consentVersion = consentGiven
    ? String(extra.marketing_consent_version || 'waitlist_en_v1').slice(0, 32)
    : null;
  const sql = `
    INSERT INTO waitlist (
      name, email, utm_source, ip_address,
      utm_medium, utm_campaign, utm_content,
      landing_locale, marketing_consent, marketing_consent_at,
      marketing_consent_version, platform
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
            CASE WHEN $9 THEN NOW() ELSE NULL END,
            $10, $11)
    ON CONFLICT (email) DO UPDATE SET
      name = EXCLUDED.name,
      ip_address = COALESCE(EXCLUDED.ip_address, waitlist.ip_address),
      utm_source = COALESCE(EXCLUDED.utm_source, waitlist.utm_source),
      utm_medium = COALESCE(waitlist.utm_medium, EXCLUDED.utm_medium),
      utm_campaign = COALESCE(waitlist.utm_campaign, EXCLUDED.utm_campaign),
      utm_content = COALESCE(waitlist.utm_content, EXCLUDED.utm_content),
      landing_locale = COALESCE(waitlist.landing_locale, EXCLUDED.landing_locale),
      platform = COALESCE(waitlist.platform, EXCLUDED.platform),
      marketing_consent = waitlist.marketing_consent OR EXCLUDED.marketing_consent,
      marketing_consent_at = CASE
        WHEN waitlist.marketing_consent THEN waitlist.marketing_consent_at
        WHEN EXCLUDED.marketing_consent THEN COALESCE(waitlist.marketing_consent_at, NOW())
        ELSE waitlist.marketing_consent_at
      END,
      marketing_consent_version = CASE
        WHEN waitlist.marketing_consent THEN waitlist.marketing_consent_version
        WHEN EXCLUDED.marketing_consent THEN EXCLUDED.marketing_consent_version
        ELSE waitlist.marketing_consent_version
      END
    RETURNING id, (xmax = 0) AS is_new
  `;
  const result = await query(sql, [
    name.trim(),
    email.toLowerCase().trim(),
    utmSource,
    ipAddress,
    extra.utm_medium || null,
    extra.utm_campaign || null,
    extra.utm_content || null,
    extra.landing_locale || 'en-GB',
    consentGiven,
    consentVersion,
    extra.platform || null,
  ]);
  return result.rows[0];
}

/**
 * Link waitlist email to a newly registered family (funnel conversion).
 * Idempotent — only sets converted_* once.
 */
async function linkWaitlistConversion(email, familyId) {
  if (!email || !familyId) return null;
  const result = await query(
    `UPDATE waitlist
     SET converted_family_id = $2,
         converted_at = COALESCE(converted_at, NOW())
     WHERE LOWER(email) = LOWER($1)
       AND converted_family_id IS NULL
     RETURNING id`,
    [email, familyId]
  );
  return result.rows[0] || null;
}

/**
 * Preview segment for launch invites — human approval required (no auto-send).
 */
async function listLaunchInviteCandidates({ limit = 100 } = {}) {
  const result = await query(
    `SELECT id, name, email, created_at, landing_locale, utm_source, marketing_consent,
            launch_invited_at, converted_family_id
     FROM waitlist
     WHERE marketing_consent = true
       AND launch_invited_at IS NULL
       AND converted_family_id IS NULL
     ORDER BY created_at ASC
     LIMIT $1`,
    [Math.min(limit, 500)]
  );
  return result.rows.map((row) => ({
    ...row,
    autoSendAllowed: false,
    recommendedAction: 'preview_launch_invite',
  }));
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

module.exports = {
  addWaitlistEntry,
  updateWaitlistSurvey,
  markWaitlistSkipped,
  listWaitlistEntries,
  getWaitlistStats,
  deleteWaitlistEntry,
  linkWaitlistConversion,
  listLaunchInviteCandidates,
};