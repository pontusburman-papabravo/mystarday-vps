'use strict';

/**
 * Usage-over-time insights for admin Produktanalys.
 * Source of truth: daily_log_item completions + current weekly_schedule /
 * activity_template rows. Not analytics_events.
 */

const db = require('../src/lib/db');
const {
  clampDays,
  fillDailySeries,
  weekdayFromIsoRows,
  sectionsFromRows,
  scheduleWeekdaysFromRows,
  sourceBucketsFromCounts,
  buildUsageHeadline,
  DEFINITIONS,
} = require('../src/lib/admin-usage-over-time');

const PRODUCT_FAMILY_SQL = `
  SELECT f.id
  FROM family f
  WHERE f.archived_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM parent p WHERE p.family_id = f.id AND p.is_admin = true
    )
`;

const STOCKHOLM_TODAY_SQL = `(CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Stockholm')::date`;
const COMPLETION_DAY_SQL = `COALESCE(dli.completed_date, (dli.completed_at AT TIME ZONE 'Europe/Stockholm')::date)`;

function toInt(value) {
  return parseInt(value, 10) || 0;
}

function toIsoDate(value) {
  if (value == null) return null;
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

async function getUsageOverTime(daysInput) {
  const days = clampDays(daysInput);
  const bounds = await db.query(
    `SELECT
       (${STOCKHOLM_TODAY_SQL})::text AS to_day,
       ((${STOCKHOLM_TODAY_SQL} - ($1::int - 1)))::text AS from_day`,
    [days]
  );
  const fromDay = toIsoDate(bounds.rows[0].from_day);
  const toDay = toIsoDate(bounds.rows[0].to_day);

  const [
    familiesRes,
    activeRes,
    dailyRes,
    weekdayRes,
    sectionRes,
    templateRes,
    completionSourceRes,
    topActivitiesRes,
    scheduleWeekdayRes,
    namedTemplatesRes,
    coverageRes,
    rewardsRes,
    specialDaysRes,
  ] = await Promise.all([
    db.query(`SELECT COUNT(*)::int AS families FROM (${PRODUCT_FAMILY_SQL}) pf`),
    db.query(
      `SELECT
         COUNT(DISTINCT c.family_id)::int AS families,
         COUNT(DISTINCT dl.child_id)::int AS children,
         COUNT(*)::int AS completions
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       JOIN child c ON c.id = dl.child_id
       JOIN (${PRODUCT_FAMILY_SQL}) pf ON pf.id = c.family_id
       WHERE dli.completed = true
         AND ${COMPLETION_DAY_SQL} BETWEEN $1::date AND $2::date`,
      [fromDay, toDay]
    ),
    db.query(
      `SELECT
         (${COMPLETION_DAY_SQL})::text AS day,
         COUNT(*)::int AS completions,
         COUNT(DISTINCT c.family_id)::int AS families,
         COUNT(DISTINCT dl.child_id)::int AS children
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       JOIN child c ON c.id = dl.child_id
       JOIN (${PRODUCT_FAMILY_SQL}) pf ON pf.id = c.family_id
       WHERE dli.completed = true
         AND ${COMPLETION_DAY_SQL} BETWEEN $1::date AND $2::date
       GROUP BY 1
       ORDER BY 1`,
      [fromDay, toDay]
    ),
    db.query(
      `SELECT
         EXTRACT(ISODOW FROM ${COMPLETION_DAY_SQL})::int AS iso_dow,
         COUNT(*)::int AS completions,
         COUNT(DISTINCT c.family_id)::int AS families
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       JOIN child c ON c.id = dl.child_id
       JOIN (${PRODUCT_FAMILY_SQL}) pf ON pf.id = c.family_id
       WHERE dli.completed = true
         AND ${COMPLETION_DAY_SQL} BETWEEN $1::date AND $2::date
       GROUP BY 1
       ORDER BY 1`,
      [fromDay, toDay]
    ),
    db.query(
      `SELECT
         COALESCE(NULLIF(TRIM(dli.section), ''), 'okand') AS section,
         COUNT(*)::int AS completions,
         COUNT(DISTINCT c.family_id)::int AS families
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       JOIN child c ON c.id = dl.child_id
       JOIN (${PRODUCT_FAMILY_SQL}) pf ON pf.id = c.family_id
       WHERE dli.completed = true
         AND ${COMPLETION_DAY_SQL} BETWEEN $1::date AND $2::date
       GROUP BY 1`,
      [fromDay, toDay]
    ),
    db.query(
      `SELECT
         COUNT(*) FILTER (WHERE COALESCE(at.source, '') = 'user')::int AS user_templates,
         COUNT(DISTINCT at.family_id) FILTER (WHERE COALESCE(at.source, '') = 'user')::int AS families_with_user,
         COUNT(*) FILTER (WHERE COALESCE(at.source, '') = 'admin')::int AS library_templates,
         COUNT(DISTINCT at.family_id) FILTER (WHERE COALESCE(at.source, '') = 'admin')::int AS families_with_library,
         COUNT(*) FILTER (WHERE COALESCE(at.source, '') NOT IN ('user', 'admin'))::int AS unknown_templates,
         COUNT(DISTINCT at.family_id) FILTER (
           WHERE COALESCE(at.source, '') NOT IN ('user', 'admin')
         )::int AS families_with_unknown,
         COUNT(*)::int AS templates_total,
         COUNT(DISTINCT at.family_id)::int AS families_with_any_template
       FROM activity_template at
       JOIN (${PRODUCT_FAMILY_SQL}) pf ON pf.id = at.family_id`
    ),
    db.query(
      `SELECT
         CASE
           WHEN COALESCE(at.source, '') = 'user' THEN 'user'
           WHEN COALESCE(at.source, '') = 'admin' THEN 'library'
           ELSE 'unknown'
         END AS source_bucket,
         COUNT(*)::int AS completions,
         COUNT(DISTINCT c.family_id)::int AS families
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       JOIN child c ON c.id = dl.child_id
       JOIN (${PRODUCT_FAMILY_SQL}) pf ON pf.id = c.family_id
       LEFT JOIN activity_template at ON at.id = dli.activity_template_id
       WHERE dli.completed = true
         AND ${COMPLETION_DAY_SQL} BETWEEN $1::date AND $2::date
       GROUP BY 1`,
      [fromDay, toDay]
    ),
    db.query(
      `SELECT
         dli.name,
         COUNT(*)::int AS completions,
         COUNT(DISTINCT c.family_id)::int AS families
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       JOIN child c ON c.id = dl.child_id
       JOIN (${PRODUCT_FAMILY_SQL}) pf ON pf.id = c.family_id
       WHERE dli.completed = true
         AND ${COMPLETION_DAY_SQL} BETWEEN $1::date AND $2::date
         AND dli.name IS NOT NULL
         AND BTRIM(dli.name) <> ''
       GROUP BY dli.name
       ORDER BY completions DESC, families DESC, dli.name ASC
       LIMIT 12`,
      [fromDay, toDay]
    ),
    db.query(
      `SELECT
         ws.day_of_week,
         COUNT(wsi.id)::int AS items,
         COUNT(DISTINCT ws.child_id)::int AS children
       FROM weekly_schedule ws
       JOIN weekly_schedule_item wsi ON wsi.weekly_schedule_id = ws.id
       JOIN child c ON c.id = ws.child_id
       JOIN (${PRODUCT_FAMILY_SQL}) pf ON pf.id = c.family_id
       WHERE ws.child_id IS NOT NULL
         AND ws.day_of_week IS NOT NULL
       GROUP BY ws.day_of_week
       ORDER BY ws.day_of_week`
    ),
    db.query(
      `SELECT
         BTRIM(ws.name) AS name,
         COUNT(*)::int AS schedule_rows,
         COUNT(DISTINCT COALESCE(ws.family_id, c.family_id))::int AS families,
         COUNT(DISTINCT ws.child_id)::int AS children
       FROM weekly_schedule ws
       LEFT JOIN child c ON c.id = ws.child_id
       JOIN (${PRODUCT_FAMILY_SQL}) pf
         ON pf.id = COALESCE(ws.family_id, c.family_id)
       WHERE ws.name IS NOT NULL
         AND BTRIM(ws.name) <> ''
       GROUP BY 1
       ORDER BY families DESC, schedule_rows DESC, name ASC
       LIMIT 15`
    ),
    db.query(
      `SELECT
         (SELECT COUNT(*)::int FROM child c
            JOIN (${PRODUCT_FAMILY_SQL}) pf ON pf.id = c.family_id) AS children,
         (SELECT COUNT(DISTINCT ws.child_id)::int
            FROM weekly_schedule ws
            JOIN child c ON c.id = ws.child_id
            JOIN (${PRODUCT_FAMILY_SQL}) pf ON pf.id = c.family_id
            WHERE ws.child_id IS NOT NULL AND ws.day_of_week IS NOT NULL) AS children_with_week,
         (SELECT COUNT(DISTINCT ws.child_id)::int
            FROM weekly_schedule ws
            JOIN weekly_schedule_item wsi ON wsi.weekly_schedule_id = ws.id
            JOIN child c ON c.id = ws.child_id
            JOIN (${PRODUCT_FAMILY_SQL}) pf ON pf.id = c.family_id
            WHERE ws.child_id IS NOT NULL) AS children_with_items`
    ),
    db.query(
      `SELECT
         COUNT(*)::int AS redemptions,
         COUNT(DISTINCT r.family_id)::int AS families,
         COUNT(DISTINCT rr.child_id)::int AS children
       FROM reward_redemption rr
       JOIN reward r ON r.id = rr.reward_id
       JOIN (${PRODUCT_FAMILY_SQL}) pf ON pf.id = r.family_id
       WHERE (COALESCE(rr.redeemed_at, rr.created_at) AT TIME ZONE 'Europe/Stockholm')::date
         BETWEEN $1::date AND $2::date`,
      [fromDay, toDay]
    ),
    db.query(
      `SELECT
         COUNT(*)::int AS special_days,
         COUNT(DISTINCT sds.child_id)::int AS children
       FROM special_day_schedule sds
       JOIN child c ON c.id = sds.child_id
       JOIN (${PRODUCT_FAMILY_SQL}) pf ON pf.id = c.family_id`
    ),
  ]);

  const daily = fillDailySeries(dailyRes.rows.map((row) => ({
    day: toIsoDate(row.day),
    completions: toInt(row.completions),
    families: toInt(row.families),
    children: toInt(row.children),
  })), fromDay, toDay);

  const weekday = weekdayFromIsoRows(weekdayRes.rows);
  const sections = sectionsFromRows(sectionRes.rows);
  const templates = templateRes.rows[0] || {};
  const custom = {
    families_with_user: toInt(templates.families_with_user),
    families_with_library: toInt(templates.families_with_library),
    families_with_unknown: toInt(templates.families_with_unknown),
    families_with_any_template: toInt(templates.families_with_any_template),
    user_templates: toInt(templates.user_templates),
    library_templates: toInt(templates.library_templates),
    unknown_templates: toInt(templates.unknown_templates),
    templates_total: toInt(templates.templates_total),
  };
  const templateSources = sourceBucketsFromCounts({
    user: custom.user_templates,
    library: custom.library_templates,
    unknown: custom.unknown_templates,
  });
  const completionSourceMap = { user: 0, library: 0, unknown: 0 };
  const completionFamilyMap = { user: 0, library: 0, unknown: 0 };
  for (const row of completionSourceRes.rows) {
    const key = row.source_bucket === 'user' || row.source_bucket === 'library'
      ? row.source_bucket
      : 'unknown';
    completionSourceMap[key] += toInt(row.completions);
    completionFamilyMap[key] += toInt(row.families);
  }
  const completionSources = sourceBucketsFromCounts(completionSourceMap);
  completionSources.families = completionFamilyMap;

  const coverage = coverageRes.rows[0] || {};
  const rewards = rewardsRes.rows[0] || {};
  const special = specialDaysRes.rows[0] || {};
  const active = activeRes.rows[0] || {};
  const peakDailyFamilies = daily.reduce((max, row) => Math.max(max, row.families), 0);

  const headline = buildUsageHeadline({ weekday, custom, periodDays: days });

  return {
    period: {
      days,
      from: fromDay,
      to: toDay,
      timezone: 'Europe/Stockholm',
    },
    headline,
    definitions: DEFINITIONS,
    totals: {
      product_families: toInt(familiesRes.rows[0] && familiesRes.rows[0].families),
      completions: toInt(active.completions),
      families_active: toInt(active.families),
      children_active: toInt(active.children),
      peak_daily_families: peakDailyFamilies,
      children: toInt(coverage.children),
      children_with_week: toInt(coverage.children_with_week),
      children_with_items: toInt(coverage.children_with_items),
    },
    daily,
    weekday,
    sections,
    custom,
    template_sources: templateSources,
    completion_sources: completionSources,
    top_activities: topActivitiesRes.rows.map((row) => ({
      name: String(row.name || '').trim(),
      completions: toInt(row.completions),
      families: toInt(row.families),
    })),
    schedule_weekdays: scheduleWeekdaysFromRows(scheduleWeekdayRes.rows),
    named_templates: namedTemplatesRes.rows.map((row) => ({
      name: String(row.name || '').trim(),
      schedule_rows: toInt(row.schedule_rows),
      families: toInt(row.families),
      children: toInt(row.children),
    })),
    rewards: {
      redemptions: toInt(rewards.redemptions),
      families: toInt(rewards.families),
      children: toInt(rewards.children),
    },
    special_days: {
      count: toInt(special.special_days),
      children: toInt(special.children),
    },
  };
}

module.exports = {
  getUsageOverTime,
  PRODUCT_FAMILY_SQL,
};
