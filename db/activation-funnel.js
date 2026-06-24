'use strict';

const db = require('../src/lib/db');

/**
 * Weekly cohort activation funnel (ACT-1 §6.2).
 * @param {number} weeks
 */
async function getActivationFunnelCohorts(weeks = 8) {
  const safeWeeks = Math.min(52, Math.max(1, weeks));
  const result = await db.query(
    `WITH cohort AS (
       SELECT f.id AS family_id,
              date_trunc('week', f.created_at)::date AS cohort_week,
              f.created_at
       FROM family f
       WHERE f.archived_at IS NULL
         AND f.created_at >= date_trunc('week', NOW()) - ($1::int - 1) * interval '1 week'
     ),
     event_counts AS (
       SELECT c.cohort_week,
              COUNT(DISTINCT c.family_id)::int AS signup,
              COUNT(DISTINCT CASE WHEN ae.event_type = 'activation_onboarding_started' THEN c.family_id END)::int AS onboarding_started,
              COUNT(DISTINCT CASE WHEN ae.event_type = 'starter_template_selected' THEN c.family_id END)::int AS template_selected,
              COUNT(DISTINCT CASE WHEN s.schema_saved_at IS NOT NULL THEN c.family_id END)::int AS schema_saved,
              COUNT(DISTINCT CASE WHEN s.child_access_completed_at IS NOT NULL THEN c.family_id END)::int AS child_access,
              COUNT(DISTINCT CASE WHEN s.first_completion_at IS NOT NULL THEN c.family_id END)::int AS first_completion,
              COUNT(DISTINCT CASE WHEN s.p0_activated_within_48h THEN c.family_id END)::int AS p0_activated_48h,
              COUNT(DISTINCT CASE WHEN ae_d7.family_id IS NOT NULL THEN c.family_id END)::int AS active_day_7,
              COUNT(DISTINCT CASE WHEN ae_d14.family_id IS NOT NULL THEN c.family_id END)::int AS active_day_14
       FROM cohort c
       LEFT JOIN family_activation_state s ON s.family_id = c.family_id
       LEFT JOIN analytics_events ae ON ae.family_id = c.family_id
         AND ae.event_type IN ('activation_onboarding_started', 'starter_template_selected')
       LEFT JOIN LATERAL (
         SELECT 1 AS family_id
         FROM analytics_events ae2
         WHERE ae2.family_id = c.family_id
           AND ae2.created_at >= c.created_at + interval '6 days'
           AND ae2.created_at < c.created_at + interval '8 days'
         LIMIT 1
       ) ae_d7 ON true
       LEFT JOIN LATERAL (
         SELECT 1 AS family_id
         FROM analytics_events ae3
         WHERE ae3.family_id = c.family_id
           AND ae3.created_at >= c.created_at + interval '13 days'
           AND ae3.created_at < c.created_at + interval '15 days'
         LIMIT 1
       ) ae_d14 ON true
       GROUP BY c.cohort_week
     )
     SELECT * FROM event_counts
     ORDER BY cohort_week DESC`,
    [safeWeeks]
  );

  const steps = [
    { key: 'signup', label: 'Signup' },
    { key: 'onboarding_started', label: 'Onboarding started' },
    { key: 'template_selected', label: 'Template selected' },
    { key: 'schema_saved', label: 'Schema saved' },
    { key: 'child_access', label: 'Child access' },
    { key: 'first_completion', label: 'First completion' },
    { key: 'p0_activated_48h', label: 'P0 within 48h' },
    { key: 'active_day_7', label: 'Active day 7' },
    { key: 'active_day_14', label: 'Active day 14' },
  ];

  return {
    steps,
    cohorts: result.rows.map((row) => ({
      cohort_week: row.cohort_week,
      counts: Object.fromEntries(steps.map((s) => [s.key, row[s.key] || 0])),
      rates: buildRates(row, steps),
    })),
  };
}

function buildRates(row, steps) {
  const signup = row.signup || 0;
  const rates = {};
  for (const s of steps) {
    rates[s.key] = signup > 0 ? Math.round((1000 * (row[s.key] || 0)) / signup) / 10 : 0;
  }
  return rates;
}

const VARIANT_META = [
  { key: 'legacy', label: 'Legacy' },
  { key: 'template_only', label: 'Mall (A)' },
  { key: 'template_plus_ai', label: 'Mall + AI (B)' },
];

/**
 * ACT-1 PR5 — activation_rate_48h per experiment variant, weekly + totals.
 * @param {number} weeks
 */
async function getActivationExperimentCohorts(weeks = 8) {
  const safeWeeks = Math.min(52, Math.max(1, weeks));
  const result = await db.query(
    `SELECT date_trunc('week', signup_at)::date AS cohort_week,
            activation_variant,
            COUNT(*)::int AS signups,
            COUNT(*) FILTER (WHERE p0_activated_within_48h)::int AS p0_48h,
            COUNT(*) FILTER (WHERE p0_activated_at IS NOT NULL)::int AS p0_any
     FROM family_activation_state
     WHERE signup_at >= date_trunc('week', NOW()) - ($1::int - 1) * interval '1 week'
     GROUP BY cohort_week, activation_variant
     ORDER BY cohort_week DESC, activation_variant ASC`,
    [safeWeeks]
  );

  const byWeekMap = new Map();
  const totals = Object.fromEntries(
    VARIANT_META.map((v) => [v.key, { signups: 0, p0_48h: 0, p0_any: 0, rate_48h: 0 }])
  );

  for (const row of result.rows) {
    const key = row.activation_variant || 'legacy';
    if (!byWeekMap.has(row.cohort_week)) {
      byWeekMap.set(row.cohort_week, {
        cohort_week: row.cohort_week,
        variants: Object.fromEntries(
          VARIANT_META.map((v) => [v.key, { signups: 0, p0_48h: 0, p0_any: 0, rate_48h: 0 }])
        ),
      });
    }
    const weekEntry = byWeekMap.get(row.cohort_week);
    const signups = row.signups || 0;
    const p0_48h = row.p0_48h || 0;
    const p0_any = row.p0_any || 0;
    const bucket = {
      signups,
      p0_48h,
      p0_any,
      rate_48h: signups > 0 ? Math.round((1000 * p0_48h) / signups) / 10 : 0,
    };
    if (weekEntry.variants[key]) {
      weekEntry.variants[key] = bucket;
    }
    if (totals[key]) {
      totals[key].signups += signups;
      totals[key].p0_48h += p0_48h;
      totals[key].p0_any += p0_any;
    }
  }

  for (const v of VARIANT_META) {
    const t = totals[v.key];
    t.rate_48h = t.signups > 0 ? Math.round((1000 * t.p0_48h) / t.signups) / 10 : 0;
  }

  return {
    variants: VARIANT_META,
    cohorts: Array.from(byWeekMap.values()),
    totals,
  };
}

module.exports = { getActivationFunnelCohorts, getActivationExperimentCohorts };
