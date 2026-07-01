/**
 * User statistics DB module.
 * Owns: parent/child aggregate queries, daily_log aggregations, share-link stats.
 * Does NOT own: any other table — read-only statistics only.
 */

const db = require('../src/lib/db');

// ─── Parents ──────────────────────────────────────────────

/**
 * Returns parent-level statistics.
 * - total: all registered parents
 * - active_7d / active_30d: parents with at least one login event
 * - avg_children: average children per parent
 */
async function getParentStats() {
  const [totals, active7d, active30d, childrenPerParent] = await Promise.all([
    db.query(`
      SELECT COUNT(*) AS total FROM parent
      WHERE pending_deletion = false
    `),
    db.query(`
      SELECT COUNT(DISTINCT le.user_id) AS cnt
      FROM login_event le
      JOIN parent p ON p.id = le.user_id
      WHERE le.role = 'parent'
        AND p.is_admin = false
        AND p.pending_deletion = false
        AND le.occurred_at >= NOW() - INTERVAL '7 days'
    `),
    db.query(`
      SELECT COUNT(DISTINCT le.user_id) AS cnt
      FROM login_event le
      JOIN parent p ON p.id = le.user_id
      WHERE le.role = 'parent'
        AND p.is_admin = false
        AND p.pending_deletion = false
        AND le.occurred_at >= NOW() - INTERVAL '30 days'
    `),
    db.query(`
      SELECT ROUND(AVG(child_count)::numeric, 2) AS avg_children
      FROM (
        SELECT p.id, COUNT(pc.child_id) AS child_count
        FROM parent p
        JOIN parent_child pc ON pc.parent_id = p.id
        WHERE p.pending_deletion = false
        GROUP BY p.id
      ) sub
    `),
  ]);

  return {
    total:          parseInt(totals.rows[0].total || 0),
    active_7d:      parseInt(active7d.rows[0].cnt || 0),
    active_30d:     parseInt(active30d.rows[0].cnt || 0),
    avg_children:   parseFloat(childrenPerParent.rows[0].avg_children || 0),
  };
}

// ─── Children ─────────────────────────────────────────────

/**
 * Returns child-level statistics.
 * - total: all registered children
 * - active_7d / active_30d: children with at least one activity completion
 * - avg_completion_rate: average completed/total ratio (last 30d)
 * - total_stars_30d: total stars earned in last 30 days
 */
async function getChildStats() {
  const [totals, active7d, active30d, completionRate, stars30d] = await Promise.all([
    db.query(`
      SELECT COUNT(*) AS total FROM child
    `),
    db.query(`
      SELECT COUNT(DISTINCT child_id) AS cnt
      FROM daily_log dl
      JOIN daily_log_item dli ON dli.daily_log_id = dl.id
      WHERE dli.completed = true
        AND dl.date >= CURRENT_DATE - INTERVAL '7 days'
    `),
    db.query(`
      SELECT COUNT(DISTINCT child_id) AS cnt
      FROM daily_log dl
      JOIN daily_log_item dli ON dli.daily_log_id = dl.id
      WHERE dli.completed = true
        AND dl.date >= CURRENT_DATE - INTERVAL '30 days'
    `),
    db.query(`
      WITH daily_stats AS (
        SELECT
          dl.child_id,
          SUM(CASE WHEN dli.completed THEN 1 ELSE 0 END) AS completed,
          COUNT(dli.id) AS total
        FROM daily_log dl
        JOIN daily_log_item dli ON dli.daily_log_id = dl.id
        WHERE dl.date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY dl.child_id
        HAVING COUNT(dli.id) > 0
      )
      SELECT ROUND(AVG(completion_rate)::numeric, 1) AS avg_rate
      FROM (
        SELECT child_id, completed, total, (completed::numeric / NULLIF(total, 0)) * 100 AS completion_rate
        FROM daily_stats
      ) sub
    `),
    db.query(`
      SELECT COALESCE(SUM(dli.star_value), 0) AS total
      FROM daily_log dl
      JOIN daily_log_item dli ON dli.daily_log_id = dl.id
      WHERE dl.date >= CURRENT_DATE - INTERVAL '30 days'
        AND dli.completed = true
    `),
  ]);

  return {
    total:               parseInt(totals.rows[0].total || 0),
    active_7d:           parseInt(active7d.rows[0].cnt || 0),
    active_30d:          parseInt(active30d.rows[0].cnt || 0),
    avg_completion_rate: parseFloat(completionRate.rows[0].avg_rate || 0),
    total_stars_30d:     parseInt(stars30d.rows[0].total || 0),
  };
}

// ─── Professional Share Links ──────────────────────────────

/**
 * Returns share-link statistics for pedagog/terapeut usage.
 * Gracefully returns null if the table does not exist yet.
 */
async function getShareLinkStats() {
  try {
    const [totals, active30d, byStatus, topFields] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*) AS total_links,
          COUNT(CASE WHEN revoked_at IS NULL THEN 1 END) AS active_links,
          COUNT(CASE WHEN revoked_at IS NOT NULL THEN 1 END) AS revoked_links,
          COALESCE(SUM(view_count), 0) AS total_views
        FROM professional_share_link
      `),
      db.query(`
        SELECT COUNT(*) AS cnt
        FROM professional_share_link
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `),
      db.query(`
        SELECT
          COUNT(CASE WHEN revoked_at IS NULL THEN 1 END) AS active,
          COUNT(CASE WHEN revoked_at IS NOT NULL THEN 1 END) AS revoked
        FROM professional_share_link
      `),
      db.query(`
        SELECT fields, COUNT(*) AS link_count
        FROM professional_share_link
        GROUP BY fields
        ORDER BY link_count DESC
        LIMIT 10
      `),
    ]);

    const topRow = totals.rows[0];

    // Parse field frequencies from TEXT[] arrays
    const fieldFreq = {};
    for (const row of topFields.rows) {
      try {
        const fields = Array.isArray(row.fields) ? row.fields : [];
        for (const field of fields) {
          const label = field.label || field;
          fieldFreq[label] = (fieldFreq[label] || 0) + parseInt(row.link_count);
        }
      } catch (_) {}
    }

    const popularFields = Object.entries(fieldFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, count]) => ({ label, count }));

    return {
      available: true,
      total_links:    parseInt(topRow.total_links || 0),
      active_links:   parseInt(topRow.active_links || 0),
      revoked_links:  parseInt(topRow.revoked_links || 0),
      total_views:    parseInt(topRow.total_views || 0),
      created_30d:    parseInt(active30d.rows[0].cnt || 0),
      active_count:   parseInt(byStatus.rows[0].active || 0),
      revoked_count:  parseInt(byStatus.rows[0].revoked || 0),
      popular_fields: popularFields,
    };
  } catch (err) {
    // Table doesn't exist yet
    if (err.code === '42P01' || err.message.includes('does not exist')) {
      return { available: false };
    }
    throw err;
  }
}

module.exports = { getParentStats, getChildStats, getShareLinkStats };