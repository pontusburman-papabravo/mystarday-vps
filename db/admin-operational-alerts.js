'use strict';

const db = require('../src/lib/db');

/**
 * @param {object} alert
 * @param {string} alert.slug
 * @param {string} [alert.category]
 * @param {string} [alert.severity]
 * @param {string} alert.title
 * @param {string} alert.body
 * @param {string} [alert.action_route]
 * @param {object} [alert.metrics]
 */
async function upsertAlert(alert) {
  const { rows } = await db.query(
    `INSERT INTO admin_operational_alert (
       slug, category, severity, title, body, action_route, metrics
     ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     ON CONFLICT (slug) DO UPDATE SET
       category = EXCLUDED.category,
       severity = EXCLUDED.severity,
       title = EXCLUDED.title,
       body = EXCLUDED.body,
       action_route = EXCLUDED.action_route,
       metrics = EXCLUDED.metrics,
       created_at = NOW()
     RETURNING id, slug, category, severity, title, body, action_route, metrics, created_at`,
    [
      alert.slug,
      alert.category || 'activation',
      alert.severity || 'info',
      alert.title,
      alert.body,
      alert.action_route || null,
      JSON.stringify(alert.metrics || {}),
    ]
  );
  return rows[0];
}

async function listActive(limit = 20) {
  const { rows } = await db.query(
    `SELECT id, slug, category, severity, title, body, action_route, metrics, created_at
     FROM admin_operational_alert
     WHERE dismissed_at IS NULL
     ORDER BY
       CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
       created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

async function dismiss(alertId, parentId) {
  const { rows } = await db.query(
    `UPDATE admin_operational_alert
     SET dismissed_at = NOW(), dismissed_by = $2
     WHERE id = $1 AND dismissed_at IS NULL
     RETURNING id`,
    [alertId, parentId]
  );
  return rows[0] || null;
}

async function pruneOlderThanDays(days = 30) {
  const { rowCount } = await db.query(
    `DELETE FROM admin_operational_alert
     WHERE created_at < NOW() - ($1::int * interval '1 day')`,
    [days]
  );
  return rowCount;
}

/** Map DB rows to start-summary recommendation cards. */
function toRecommendationCards(rows) {
  const severityPriority = { critical: 0, warning: 1, info: 2 };
  return rows.map((row) => ({
    type: `operational_${row.category}`,
    id: row.id,
    slug: row.slug,
    severity: row.severity,
    title: row.title,
    body: row.body,
    route: row.action_route || '#analytics',
    priority: severityPriority[row.severity] ?? 2,
    createdAt: row.created_at,
    dismissible: true,
  }));
}

module.exports = {
  upsertAlert,
  listActive,
  dismiss,
  pruneOlderThanDays,
  toRecommendationCards,
};
