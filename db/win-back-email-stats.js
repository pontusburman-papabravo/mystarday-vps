/**
 * Win-back email engagement — logins and product activity after send.
 * Attribution window: 14 days after sent_at (parent login, För dig, completions).
 */

const db = require('../src/lib/db');
const { getWinBackStaleHours } = require('../src/lib/win-back-config');

const ATTRIBUTION_DAYS = 14;

/** Shared LATERAL joins for per-send engagement (sent rows only). */
const ENGAGEMENT_LATERALS = `
  LEFT JOIN LATERAL (
    SELECT
      MIN(le.occurred_at) AS first_parent_login_at,
      BOOL_OR(le.occurred_at <= wbel.sent_at + INTERVAL '7 days') AS parent_login_within_7d
    FROM login_event le
    WHERE wbel.parent_id IS NOT NULL
      AND le.user_id = wbel.parent_id
      AND le.role = 'parent'
      AND le.occurred_at > wbel.sent_at
      AND le.occurred_at <= wbel.sent_at + INTERVAL '${ATTRIBUTION_DAYS} days'
  ) parent_login ON wbel.status = 'sent' AND wbel.sent_at IS NOT NULL
  LEFT JOIN LATERAL (
    SELECT i.goal_slug, i.installed_at
    FROM for_dig_goal_install i
    WHERE wbel.family_id IS NOT NULL
      AND i.family_id = wbel.family_id
      AND i.installed_at > wbel.sent_at
      AND i.installed_at <= wbel.sent_at + INTERVAL '${ATTRIBUTION_DAYS} days'
    ORDER BY i.installed_at ASC
    LIMIT 1
  ) for_dig ON wbel.status = 'sent' AND wbel.sent_at IS NOT NULL
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS n
    FROM daily_log_item dli
    JOIN daily_log dl ON dl.id = dli.daily_log_id
    WHERE wbel.child_id IS NOT NULL
      AND dl.child_id = wbel.child_id
      AND dli.completed = true
      AND COALESCE(dli.completed_at, dli.completed_date::timestamptz) > wbel.sent_at
      AND COALESCE(dli.completed_at, dli.completed_date::timestamptz)
            <= wbel.sent_at + INTERVAL '${ATTRIBUTION_DAYS} days'
  ) completions ON wbel.status = 'sent' AND wbel.sent_at IS NOT NULL
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS n
    FROM analytics_events ae
    WHERE wbel.family_id IS NOT NULL
      AND ae.family_id = wbel.family_id
      AND ae.event_type = 'win_back_landing'
      AND ae.created_at > wbel.sent_at
      AND ae.created_at <= wbel.sent_at + INTERVAL '${ATTRIBUTION_DAYS} days'
  ) landings ON wbel.status = 'sent' AND wbel.sent_at IS NOT NULL
`;

function mapEngagementRow(row) {
  const firstLogin = row.first_parent_login_at || null;
  const sentAt = row.sent_at ? new Date(row.sent_at) : null;
  let daysToReturn = null;
  if (firstLogin && sentAt) {
    daysToReturn = Math.round((new Date(firstLogin) - sentAt) / (1000 * 60 * 60 * 24));
  }

  return {
    returned: !!firstLogin,
    returned_within_7d: !!row.parent_login_within_7d,
    first_login_at: firstLogin,
    days_to_return: daysToReturn,
    for_dig_goal_slug: row.for_dig_goal_slug || null,
    for_dig_installed_at: row.for_dig_installed_at || null,
    completions_after_send: row.completions_after_send || 0,
    win_back_landings: row.win_back_landings || 0,
    returned_at: row.returned_at || null,
  };
}

/**
 * Engagement metrics per log row (sent emails only).
 * @param {string[]} logIds
 * @returns {Promise<Record<string, object>>}
 */
async function getEngagementByLogIds(logIds) {
  if (!logIds?.length) return {};

  const result = await db.query(
    `SELECT
       wbel.id AS log_id,
       wbel.status,
       wbel.sent_at,
       parent_login.first_parent_login_at,
       parent_login.parent_login_within_7d,
       for_dig.goal_slug AS for_dig_goal_slug,
       for_dig.installed_at AS for_dig_installed_at,
       COALESCE(completions.n, 0)::int AS completions_after_send,
       COALESCE(landings.n, 0)::int AS win_back_landings,
       wbel.returned_at
     FROM win_back_email_log wbel
     ${ENGAGEMENT_LATERALS}
     WHERE wbel.id = ANY($1::uuid[])`,
    [logIds]
  );

  const out = {};
  for (const row of result.rows) {
    out[row.log_id] = mapEngagementRow(row);
  }
  return out;
}

/**
 * Attach engagement objects to email log records (mutates copies in return array).
 * @param {Array<object>} records
 */
async function attachEngagementToRecords(records) {
  const sentIds = records.filter((r) => r.status === 'sent' && r.sent_at).map((r) => r.id);
  const byId = await getEngagementByLogIds(sentIds);

  return records.map((r) => {
    if (r.status !== 'sent' || !r.sent_at) {
      return { ...r, engagement: null };
    }
    return {
      ...r,
      engagement: byId[r.id] || mapEngagementRow({
        sent_at: r.sent_at,
        first_parent_login_at: null,
        parent_login_within_7d: false,
        for_dig_goal_slug: null,
        for_dig_installed_at: null,
        completions_after_send: 0,
        win_back_landings: 0,
        returned_at: null,
      }),
    };
  });
}

/**
 * Aggregate return stats for all sent win-back emails.
 */
async function getEngagementSummary() {
  const result = await db.query(
    `WITH sent AS (
       SELECT wbel.id
       FROM win_back_email_log wbel
       WHERE wbel.status = 'sent'
         AND wbel.sent_at IS NOT NULL
         AND COALESCE(wbel.email_type, 'win-back') = 'win-back'
     ),
     enriched AS (
       SELECT
         wbel.id,
         wbel.sent_at,
         parent_login.first_parent_login_at,
         parent_login.parent_login_within_7d,
         for_dig.goal_slug AS for_dig_goal_slug,
         COALESCE(completions.n, 0)::int AS completions_after_send,
         COALESCE(landings.n, 0)::int AS win_back_landings,
         wbel.returned_at
       FROM win_back_email_log wbel
       INNER JOIN sent s ON s.id = wbel.id
       ${ENGAGEMENT_LATERALS}
     )
     SELECT
       COUNT(*)::int AS sent_tracked,
       COUNT(*) FILTER (WHERE sent_at > NOW() - INTERVAL '30 days')::int AS sent_tracked_30d,
       COUNT(*) FILTER (WHERE first_parent_login_at IS NOT NULL)::int AS returned_14d,
       COUNT(*) FILTER (WHERE parent_login_within_7d)::int AS returned_7d,
       COUNT(*) FILTER (
         WHERE first_parent_login_at IS NOT NULL
           AND sent_at > NOW() - INTERVAL '30 days'
       )::int AS returned_14d_recent,
       COUNT(*) FILTER (WHERE for_dig_goal_slug IS NOT NULL)::int AS for_dig_14d,
       COUNT(*) FILTER (WHERE completions_after_send > 0)::int AS active_completions_14d,
       COUNT(*) FILTER (WHERE win_back_landings > 0)::int AS win_back_landings_14d,
       COUNT(*) FILTER (WHERE returned_at IS NOT NULL)::int AS returned_tracked_14d
     FROM enriched`
  );

  const row = result.rows[0] || {};
  const sent = row.sent_tracked || 0;
  const returned14 = row.returned_14d || 0;

  return {
    attribution_days: ATTRIBUTION_DAYS,
    sent_tracked: sent,
    sent_tracked_30d: row.sent_tracked_30d || 0,
    returned_7d: row.returned_7d || 0,
    returned_14d: returned14,
    returned_14d_recent: row.returned_14d_recent || 0,
    return_rate_14d: sent > 0 ? Math.round((returned14 / sent) * 1000) / 10 : 0,
    for_dig_14d: row.for_dig_14d || 0,
    active_completions_14d: row.active_completions_14d || 0,
    win_back_landings_14d: row.win_back_landings_14d || 0,
    returned_tracked_14d: row.returned_tracked_14d || 0,
    stale_pending_hours: getWinBackStaleHours(),
  };
}

module.exports = {
  ATTRIBUTION_DAYS,
  getEngagementByLogIds,
  attachEngagementToRecords,
  getEngagementSummary,
  mapEngagementRow,
};
