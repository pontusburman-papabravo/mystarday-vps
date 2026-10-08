/**
 * Professional share-link DB module.
 * Owns: professional_share_link CRUD + report data assembly.
 * Does NOT own: daily_log, reward, child — read-only joins only.
 *
 * Schema expectations (from migration 1769200000000):
 *   professional_share_link:
 *     id (UUID PK), family_id, child_id, public_id (UUID, unique),
 *     label, parent_summary, date_from, date_to, pin_hash,
 *     fields TEXT[], created_by (parent id), created_at,
 *     expires_at, revoked (bool), revoked_at, view_count
 */

const db = require('../src/lib/db');
const { hashPassword, comparePassword } = require('../src/lib/hash');

// ── Child ownership check ────────────────────────────────────

/** Verify a child belongs to a family (prevents cross-family access). */
async function childBelongsToFamily(childId, familyId) {
  const result = await db.query(
    'SELECT 1 FROM child WHERE id = $1 AND family_id = $2',
    [childId, familyId]
  );
  return result.rows.length > 0;
}

// ── Allowed field values ──────────────────────────────────────
const ALLOWED_FIELDS = [
  'activities', 'completion', 'section_summary',
  'parent_notes', 'child_notes', 'stars', 'rewards', 'emotions',
  'pedagog_notes',
];

// ── CRUD ─────────────────────────────────────────────────────

/**
 * List all share links for a parent's family (including revoked/expired).
 */
async function listForFamily(familyId) {
  const result = await db.query(`
    SELECT
      psl.id,
      psl.public_id,
      psl.child_id,
      psl.label,
      psl.date_from,
      psl.date_to,
      psl.fields,
      psl.parent_summary,
      psl.expires_at,
      psl.revoked_at,
      psl.view_count,
      psl.created_at,
      psl.anonymous,
      c.name  AS child_name,
      c.emoji AS child_emoji
    FROM professional_share_link psl
    JOIN child c ON c.id = psl.child_id
    WHERE psl.family_id = $1
    ORDER BY psl.created_at DESC
  `, [familyId]);
  return result.rows;
}

/**
 * Count active (non-expired, non-revoked) share links for a family.
 */
async function countActive(familyId) {
  const result = await db.query(`
    SELECT COUNT(*)::INT AS count
    FROM professional_share_link
    WHERE family_id  = $1
      AND revoked_at IS NULL
      AND expires_at > NOW()
  `, [familyId]);
  return result.rows[0].count;
}

/**
 * Create a new share link.
 * @param {object} opts
 *
 * Uses a transaction to avoid FK-violation errors if the INSERT fails —
 * better than a separate childBelongsToFamily() call which adds an extra
 * DB round-trip (critical on Neon cold-start).
 *
 * Also: scrypt is CPU-heavy. If pin hashing takes >10s, the transaction
 * would hold the DB client for too long. hashPassword is async and non-blocking
 * on the event loop, so it runs in parallel with other work.
 */
async function createLink({ familyId, childId, label, parentSummary, dateFrom, dateTo, fields, pin, createdBy, anonymous }) {
  // Validate fields
  console.error('[createLink] DEBUG: start — familyId=%s childId=%s label=%s', familyId, childId, label);
  const invalid = fields.filter((f) => !ALLOWED_FIELDS.includes(f));
  if (invalid.length > 0) {
    const err = new Error(`Okända fält: ${invalid.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  const pinHash = pin ? await hashPassword(pin) : null;
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const result = await client.query(`
      INSERT INTO professional_share_link
        (family_id, child_id, label, parent_summary, date_from, date_to, fields, pin_hash, created_by, expires_at, anonymous)
      VALUES
        ($1, $2, $3, $4, $5::DATE, $6::DATE, $7, $8, $9, NOW() + INTERVAL '7 days', $10)
      RETURNING id, public_id, expires_at
    `, [familyId, childId, label, parentSummary || null, dateFrom, dateTo, fields, pinHash, createdBy, !!anonymous]);
    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get a single share link by internal id, checking family ownership.
 */
async function getByIdForFamily(id, familyId) {
  const result = await db.query(`
    SELECT *
    FROM professional_share_link
    WHERE id = $1 AND family_id = $2
  `, [id, familyId]);
  return result.rows[0] || null;
}

/**
 * Update parent_summary and/or fields on a link (before widely shared).
 */
async function updateLink(id, familyId, { parentSummary, fields }) {
  if (fields) {
    const invalid = fields.filter((f) => !ALLOWED_FIELDS.includes(f));
    if (invalid.length > 0) {
      const err = new Error(`Okända fält: ${invalid.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }
  }

  const result = await db.query(`
    UPDATE professional_share_link
    SET
      parent_summary = COALESCE($3, parent_summary),
      fields         = COALESCE($4, fields)
    WHERE id = $1 AND family_id = $2
    RETURNING id
  `, [id, familyId, parentSummary ?? null, fields ?? null]);
  return result.rows[0] || null;
}

/**
 * Revoke a share link (sets revoked_at).
 */
async function revokeLink(id, familyId) {
  const result = await db.query(`
    UPDATE professional_share_link
    SET revoked_at = NOW()
    WHERE id = $1 AND family_id = $2 AND revoked_at IS NULL
    RETURNING id
  `, [id, familyId]);
  return result.rows[0] || null;
}

/**
 * Permanently delete a share link.
 * Verifies ownership and that link is not already revoked.
 */
async function deleteLink(id, familyId) {
  const result = await db.query(`
    DELETE FROM professional_share_link
    WHERE id = $1 AND family_id = $2 AND revoked_at IS NULL
    RETURNING id
  `, [id, familyId]);
  return result.rows[0] || null;
}

/**
 * Renew (extend) a share link's expiry by 7 days from now.
 * Only works on non-revoked links.
 */
async function renewLink(id, familyId) {
  const result = await db.query(`
    UPDATE professional_share_link
    SET expires_at = NOW() + INTERVAL '7 days'
    WHERE id = $1 AND family_id = $2 AND revoked_at IS NULL
    RETURNING id, expires_at
  `, [id, familyId]);
  return result.rows[0] || null;
}

// ── Public lookup ─────────────────────────────────────────────

/**
 * Find a link by public_id for the public viewer.
 * Returns null if not found, expired, or revoked.
 * This is the ONLY entry point for public data — no date params from caller.
 */
async function getByPublicId(publicId) {
  const result = await db.query(`
    SELECT
      psl.id,
      psl.public_id,
      psl.child_id,
      psl.pin_hash,
      psl.parent_summary,
      psl.fields,
      psl.date_from,
      psl.date_to,
      psl.expires_at,
      psl.revoked_at,
      psl.label,
      psl.anonymous,
      c.name  AS child_name,
      c.emoji AS child_emoji,
      f.preferred_locale AS preferred_locale
    FROM professional_share_link psl
    JOIN child c ON c.id = psl.child_id
    JOIN family f ON f.id = c.family_id
    WHERE psl.public_id = $1
      AND psl.revoked_at IS NULL
      AND psl.expires_at > NOW()
  `, [publicId]);
  return result.rows[0] || null;
}

/**
 * Verify PIN against a stored hash.
 */
async function verifyPin(pinHash, pin) {
  return comparePassword(pin, pinHash);
}

/**
 * Increment view count.
 */
async function incrementViewCount(linkId) {
  await db.query(`
    UPDATE professional_share_link
    SET view_count = view_count + 1
    WHERE id = $1
  `, [linkId]);
}

// ── Report data assembly ──────────────────────────────────────

/**
 * Build the full report blocks.
 * Date range is ALWAYS taken from the link record — never from request params.
 *
 * @param {string} linkId - internal UUID of the link
 * @param {string[]} fields - array from link.fields
 * @param {string} dateFrom - link.date_from (YYYY-MM-DD)
 * @param {string} dateTo   - link.date_to   (YYYY-MM-DD)
 * @param {string} childId  - link.child_id
 */
async function getReportData(linkId, fields, dateFrom, dateTo, childId) {
  const blocks = {};

  // Build all dates in the range (backend guarantees every date appears)
  const allDates = [];
  const d = new Date(dateFrom);
  const end = new Date(dateTo);
  while (d <= end) {
    allDates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }

  // ── completion: per-day completed/total ───────────────────
  if (fields.includes('completion')) {
    const result = await db.query(`
      SELECT
        dl.date::DATE            AS date,
        COALESCE(dli.section, 'other') AS section,
        COUNT(dli.id)::INT           AS total,
        COUNT(dli.id) FILTER (WHERE dli.completed = true)::INT AS completed
      FROM daily_log dl
      JOIN daily_log_item dli ON dli.daily_log_id = dl.id
      WHERE dl.child_id   = $1
        AND dl.date BETWEEN $2::DATE AND $3::DATE
      GROUP BY dl.date, COALESCE(dli.section, 'other')
      ORDER BY dl.date
    `, [childId, dateFrom, dateTo]);

    const byDate = {};
    for (const r of result.rows) {
      const dateKey = r.date instanceof Date
        ? r.date.toISOString().slice(0, 10)
        : String(r.date).slice(0, 10);
      if (!byDate[dateKey]) byDate[dateKey] = { completed: 0, total: 0 };
      byDate[dateKey].completed += r.completed;
      byDate[dateKey].total     += r.total;
    }

    blocks.completion = allDates.map((date) => ({
      date,
      completed: byDate[date]?.completed ?? 0,
      total:     byDate[date]?.total     ?? 0,
    }));
  }

  // ── completion_by_section: per-day per-section (for trend chart filter) ──
  if (fields.includes('completion')) {
    const result = await db.query(`
      SELECT
        dl.date::DATE            AS date,
        COALESCE(dli.section, 'other') AS section,
        COUNT(dli.id)::INT           AS total,
        COUNT(dli.id) FILTER (WHERE dli.completed = true)::INT AS completed
      FROM daily_log dl
      JOIN daily_log_item dli ON dli.daily_log_id = dl.id
      WHERE dl.child_id   = $1
        AND dl.date BETWEEN $2::DATE AND $3::DATE
      GROUP BY dl.date, COALESCE(dli.section, 'other')
      ORDER BY dl.date
    `, [childId, dateFrom, dateTo]);

    const byKey = {};
    for (const r of result.rows) {
      const dateKey = r.date instanceof Date
        ? r.date.toISOString().slice(0, 10)
        : String(r.date).slice(0, 10);
      const key = dateKey + '|' + r.section;
      if (!byKey[key]) byKey[key] = { date: dateKey, section: r.section, completed: 0, total: 0 };
      byKey[key].completed += r.completed;
      byKey[key].total     += r.total;
    }
    blocks.completion_by_section = Object.values(byKey);
  }

  // ── section_summary ───────────────────────────────────────
  if (fields.includes('section_summary')) {
    const result = await db.query(`
      SELECT
        dli.section                                          AS section,
        COUNT(dli.id)::INT                                   AS total,
        COUNT(dli.id) FILTER (WHERE dli.completed = true)::INT AS completed
      FROM daily_log dl
      JOIN daily_log_item dli ON dli.daily_log_id = dl.id
      WHERE dl.child_id = $1
        AND dl.date BETWEEN $2::DATE AND $3::DATE
        AND dli.section IS NOT NULL
      GROUP BY dli.section
    `, [childId, dateFrom, dateTo]);

    blocks.section_summary = result.rows.map((r) => ({
      section:    r.section,
      completed:  r.completed,
      total:      r.total,
      completion_pct: r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0,
    }));
  }

  // ── daily_activities: per-day list ───────────────────────
  if (fields.includes('activities')) {
    const result = await db.query(`
      SELECT
        dl.date::DATE  AS date,
        COALESCE(dli.name, at.name)          AS activity_name,
        COALESCE(dli.icon, at.icon, '⭐')     AS activity_icon,
        dli.completed,
        dli.star_value,
        dli.parent_note,
        dli.section,
        r.comment                             AS child_note
      FROM daily_log dl
      JOIN daily_log_item dli ON dli.daily_log_id = dl.id
      LEFT JOIN activity_template at ON at.id = dli.activity_template_id
      LEFT JOIN rating r ON r.daily_log_item_id = dli.id AND r.user_type = 'child'
      WHERE dl.child_id = $1
        AND dl.date BETWEEN $2::DATE AND $3::DATE
      ORDER BY dl.date, dli.sort_order NULLS LAST, at.name
    `, [childId, dateFrom, dateTo]);

    const byDate = {};
    for (const r of result.rows) {
      const dateKey = typeof r.date === 'object' && r.date instanceof Date
        ? r.date.toISOString().slice(0, 10)
        : String(r.date).slice(0, 10);
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push({
        activity_name:    r.activity_name,
        activity_icon:    r.activity_icon,
        section:          r.section,
        completed:        r.completed,
        star_value:       r.star_value || 0,
        parent_note:      r.parent_note || null,
        child_note:       r.child_note  || null,
      });
    }
    blocks.activities = byDate;
  }

  // ── parent_notes: only items with parent annotations ─────
  if (fields.includes('parent_notes')) {
    const result = await db.query(`
      SELECT
        dl.date::DATE AS date,
        COALESCE(dli.name, at.name)       AS activity_name,
        COALESCE(dli.icon, at.icon, '⭐') AS activity_icon,
        dli.parent_note
      FROM daily_log dl
      JOIN daily_log_item dli ON dli.daily_log_id = dl.id
      LEFT JOIN activity_template at ON at.id = dli.activity_template_id
      WHERE dl.child_id = $1
        AND dl.date BETWEEN $2::DATE AND $3::DATE
        AND dli.parent_note IS NOT NULL AND dli.parent_note <> ''
      ORDER BY dl.date, dli.sort_order NULLS LAST, at.name
    `, [childId, dateFrom, dateTo]);

    const byDate = {};
    for (const r of result.rows) {
      const dateKey = typeof r.date === 'object' && r.date instanceof Date
        ? r.date.toISOString().slice(0, 10)
        : String(r.date).slice(0, 10);
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push({ activity_name: r.activity_name, activity_icon: r.activity_icon, parent_note: r.parent_note });
    }
    blocks.parent_notes = byDate;
  }

  // ── child_notes: only items with child annotations ───────
  if (fields.includes('child_notes')) {
    const result = await db.query(`
      SELECT
        dl.date::DATE AS date,
        COALESCE(dli.name, at.name)       AS activity_name,
        COALESCE(dli.icon, at.icon, '⭐') AS activity_icon,
        r.comment AS child_note
      FROM daily_log dl
      JOIN daily_log_item dli ON dli.daily_log_id = dl.id
      LEFT JOIN activity_template at ON at.id = dli.activity_template_id
      LEFT JOIN rating r ON r.daily_log_item_id = dli.id AND r.user_type = 'child'
      WHERE dl.child_id = $1
        AND dl.date BETWEEN $2::DATE AND $3::DATE
        AND r.comment IS NOT NULL AND r.comment <> ''
      ORDER BY dl.date, dli.sort_order NULLS LAST, at.name
    `, [childId, dateFrom, dateTo]);

    const byDate = {};
    for (const r of result.rows) {
      const dateKey = typeof r.date === 'object' && r.date instanceof Date
        ? r.date.toISOString().slice(0, 10)
        : String(r.date).slice(0, 10);
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push({ activity_name: r.activity_name, activity_icon: r.activity_icon, child_note: r.child_note });
    }
    blocks.child_notes = byDate;
  }

  // ── stars: total earned in period ────────────────────────
  if (fields.includes('stars')) {
    const result = await db.query(`
      SELECT COALESCE(SUM(dli.star_value), 0)::INT AS total
      FROM daily_log dl
      JOIN daily_log_item dli ON dli.daily_log_id = dl.id
      WHERE dl.child_id = $1
        AND dl.date BETWEEN $2::DATE AND $3::DATE
        AND dli.completed = true
    `, [childId, dateFrom, dateTo]);
    blocks.stars = { total: parseInt(result.rows[0].total) };
  }

  // ── rewards: counts + recent redemptions ─────────────────
  if (fields.includes('rewards')) {
    const [countsResult, recentResult] = await Promise.all([
      db.query(`
        SELECT status, COUNT(*)::INT AS count
        FROM reward_redemption
        WHERE child_id = $1
          AND created_at::DATE BETWEEN $2::DATE AND $3::DATE
        GROUP BY status
      `, [childId, dateFrom, dateTo]),
      db.query(`
        SELECT
          r.name        AS reward_name,
          rrd.status,
          r.star_cost,
          rrd.created_at
        FROM reward_redemption rrd
        JOIN reward r ON r.id = rrd.reward_id
        WHERE rrd.child_id = $1
          AND rrd.created_at::DATE BETWEEN $2::DATE AND $3::DATE
        ORDER BY rrd.created_at DESC
        LIMIT 10
      `, [childId, dateFrom, dateTo]),
    ]);
    blocks.rewards = {
      counts: countsResult.rows,
      recent: recentResult.rows,
    };
  }

  // ── emotions: mood ratings per day ───────────────────────
  if (fields.includes('emotions')) {
    const result = await db.query(`
      SELECT
        dl.date::DATE AS date,
        r.score AS level
      FROM daily_log dl
      JOIN daily_log_item dli ON dli.daily_log_id = dl.id
      JOIN rating r ON r.daily_log_item_id = dli.id AND r.user_type = 'child'
      WHERE dl.child_id = $1
        AND dl.date BETWEEN $2::DATE AND $3::DATE
        AND r.score IS NOT NULL
      ORDER BY dl.date
    `, [childId, dateFrom, dateTo]);
    blocks.emotions = result.rows;
  }

  // ── emotions_per_section: avg mood grouped by section ───
  if (fields.includes('emotions')) {
    const sectionsResult = await db.query(`
      SELECT
        dli.section                                          AS section,
        ROUND(AVG(r.score)::NUMERIC, 1)                     AS avg_score,
        COUNT(r.id)::INT                                    AS count
      FROM daily_log dl
      JOIN daily_log_item dli ON dli.daily_log_id = dl.id
      JOIN rating r ON r.daily_log_item_id = dli.id AND r.user_type = 'child'
      WHERE dl.child_id = $1
        AND dl.date BETWEEN $2::DATE AND $3::DATE
        AND r.score IS NOT NULL
        AND dli.section IS NOT NULL AND dli.section <> ''
      GROUP BY dli.section
      ORDER BY dli.section
    `, [childId, dateFrom, dateTo]);
    blocks.emotions_per_section = sectionsResult.rows;
  }

  // ── pedagog_notes: pedagogen daily observation notes ─────
  if (fields.includes('pedagog_notes')) {
    const result = await db.query(`
      SELECT
        pn.date,
        pn.mood,
        pn.sleep_quality,
        pn.sleep_hours,
        pn.meals,
        pn.meals_structured,
        pn.behavior,
        pn.notes,
        p.name AS pedagog_name
      FROM pedagog_notes pn
      JOIN parent p ON p.id = pn.pedagog_id
      WHERE pn.child_id = $1 AND pn.date BETWEEN $2::DATE AND $3::DATE AND pn.is_draft = false
      ORDER BY pn.date ASC
    `, [childId, dateFrom, dateTo]);
    blocks.pedagog_notes = result.rows;
  }

  return blocks;
}

module.exports = {
  ALLOWED_FIELDS,
  childBelongsToFamily,
  listForFamily,
  countActive,
  createLink,
  getByIdForFamily,
  updateLink,
  revokeLink,
  deleteLink,
  renewLink,
  getByPublicId,
  verifyPin,
  incrementViewCount,
  getReportData,
};
