'use strict';

const db = require('../src/lib/db');

/** First Success huvudtratt (PR 2) — 6 steg, family_activation_state + daily_log_item. */
const FIRST_SUCCESS_FUNNEL_STEPS = [
  { key: 'signup', label: 'Signup' },
  { key: 'child_created', label: 'Barn skapat' },
  { key: 'routine_ready', label: 'Rutin klar' },
  { key: 'child_access', label: 'Barnåtkomst' },
  { key: 'first_completion', label: 'Första stjärnan' },
  { key: 'second_day_activity', label: 'Aktiv dag 2' },
];

/**
 * Step rates as % of signup (cohort entry).
 * @param {object} row
 * @param {{ key: string }[]} steps
 */
function buildStepRates(row, steps) {
  const signup = row.signup || 0;
  const rates = {};
  for (const s of steps) {
    rates[s.key] = signup > 0 ? Math.round((1000 * (row[s.key] || 0)) / signup) / 10 : 0;
  }
  return rates;
}

/**
 * Step-to-step conversion rates between adjacent funnel steps.
 * @param {object} row
 * @param {{ key: string }[]} steps
 */
function buildStepConversions(row, steps) {
  const conversions = {};
  for (let i = 1; i < steps.length; i++) {
    const fromStep = steps[i - 1];
    const toStep = steps[i];
    const fromCount = row[fromStep.key] || 0;
    const toCount = row[toStep.key] || 0;
    const conversionKey = `${fromStep.key}_to_${toStep.key}`;
    conversions[conversionKey] = {
      from: fromStep.key,
      to: toStep.key,
      from_count: fromCount,
      to_count: toCount,
      rate_pct: fromCount > 0 ? Math.round((1000 * toCount) / fromCount) / 10 : 0,
    };
  }
  return conversions;
}

/**
 * Weekly cohort First Success funnel (PR 2).
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
     families_with_second_day AS (
       SELECT ch.family_id
       FROM child ch
       JOIN family fam ON fam.id = ch.family_id
       JOIN daily_log dl ON dl.child_id = ch.id
       JOIN daily_log_item dli ON dli.daily_log_id = dl.id
       WHERE dli.completed = true
       GROUP BY ch.family_id, fam.timezone
       HAVING COUNT(DISTINCT COALESCE(
         dli.completed_date,
         (dli.completed_at AT TIME ZONE COALESCE(fam.timezone, 'Europe/Stockholm'))::date
       )) >= 2
     )
     SELECT c.cohort_week,
            COUNT(DISTINCT c.family_id)::int AS signup,
            COUNT(DISTINCT CASE WHEN s.child_created_at IS NOT NULL THEN c.family_id END)::int AS child_created,
            COUNT(DISTINCT CASE WHEN s.schema_saved_at IS NOT NULL THEN c.family_id END)::int AS routine_ready,
            COUNT(DISTINCT CASE WHEN s.child_access_completed_at IS NOT NULL THEN c.family_id END)::int AS child_access,
            COUNT(DISTINCT CASE WHEN s.first_completion_at IS NOT NULL THEN c.family_id END)::int AS first_completion,
            COUNT(DISTINCT CASE WHEN sd.family_id IS NOT NULL THEN c.family_id END)::int AS second_day_activity
     FROM cohort c
     LEFT JOIN family_activation_state s ON s.family_id = c.family_id
     LEFT JOIN families_with_second_day sd ON sd.family_id = c.family_id
     GROUP BY c.cohort_week
     ORDER BY cohort_week DESC`,
    [safeWeeks]
  );

  const steps = FIRST_SUCCESS_FUNNEL_STEPS;

  return {
    steps,
    cohorts: result.rows.map((row) => ({
      cohort_week: row.cohort_week,
      counts: Object.fromEntries(steps.map((s) => [s.key, row[s.key] || 0])),
      rates: buildStepRates(row, steps),
      conversions: buildStepConversions(row, steps),
    })),
    childAccessDiagnostics: await getActivationChildAccessDiagnostics(safeWeeks),
  };
}

/**
 * Sub-metrics under child access (ACT-1 §10 — diagnostik, ej huvudtratt).
 * @param {number} weeks
 */
async function getActivationChildAccessDiagnostics(weeks = 8) {
  const safeWeeks = Math.min(52, Math.max(1, weeks));
  const result = await db.query(
    `WITH cohort AS (
       SELECT f.id AS family_id
       FROM family f
       WHERE f.archived_at IS NULL
         AND f.created_at >= date_trunc('week', NOW()) - ($1::int - 1) * interval '1 week'
     )
     SELECT
       COUNT(DISTINCT CASE WHEN ae.event_type = 'child_profile_created' THEN c.family_id END)::int AS child_profile_created,
       COUNT(DISTINCT CASE WHEN ae.event_type = 'child_pin_created' THEN c.family_id END)::int AS child_pin_created,
       COUNT(DISTINCT CASE WHEN ae.event_type = 'child_view_opened' THEN c.family_id END)::int AS child_view_opened,
       COUNT(DISTINCT CASE WHEN ae.event_type = 'child_handoff_skipped' THEN c.family_id END)::int AS child_handoff_skipped,
       COUNT(DISTINCT CASE WHEN s.child_access_completed_at IS NOT NULL THEN c.family_id END)::int AS child_access_completed
     FROM cohort c
     LEFT JOIN family_activation_state s ON s.family_id = c.family_id
     LEFT JOIN analytics_events ae ON ae.family_id = c.family_id
       AND ae.event_type IN (
         'child_profile_created', 'child_pin_created', 'child_view_opened', 'child_handoff_skipped'
       )`,
    [safeWeeks]
  );
  const row = result.rows[0] || {};
  const metrics = [
    { key: 'child_profile_created', label: 'Profil skapad' },
    { key: 'child_pin_created', label: 'PIN satt' },
    { key: 'child_view_opened', label: 'Barnvy öppnad' },
    { key: 'child_handoff_skipped', label: 'Handoff hoppad över' },
    { key: 'child_access_completed', label: 'Child access klar' },
  ];
  return {
    metrics,
    counts: Object.fromEntries(metrics.map((m) => [m.key, row[m.key] || 0])),
  };
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
    verdict: computeAiGoNoGoVerdict(totals),
  };
}

const MIN_VARIANT_SIGNUPS = 10;
const AI_PROMOTE_DELTA_PP = 5;

/**
 * ACT-1 PR5 go/no-go: AI only if B beats A by ≥5 pp on activation_rate_48h.
 * @param {Record<string, { signups: number, rate_48h: number }>} totals
 */
function computeAiGoNoGoVerdict(totals) {
  const a = totals.template_only || { signups: 0, rate_48h: 0 };
  const b = totals.template_plus_ai || { signups: 0, rate_48h: 0 };
  const delta = Math.round((b.rate_48h - a.rate_48h) * 10) / 10;

  if (a.signups < MIN_VARIANT_SIGNUPS || b.signups < MIN_VARIANT_SIGNUPS) {
    return {
      status: 'insufficient_data',
      message: `Behöver minst ${MIN_VARIANT_SIGNUPS} signups per variant (A: ${a.signups}, B: ${b.signups})`,
      delta_pp: delta,
      a_rate_48h: a.rate_48h,
      b_rate_48h: b.rate_48h,
    };
  }

  if (delta >= AI_PROMOTE_DELTA_PP) {
    return {
      status: 'promote_ai',
      message: `Variant B slår A med +${delta} pp — överväg att aktivera AI som standard`,
      delta_pp: delta,
      a_rate_48h: a.rate_48h,
      b_rate_48h: b.rate_48h,
    };
  }

  return {
    status: 'keep_template_only',
    message: `Variant B når inte +${AI_PROMOTE_DELTA_PP} pp mot A (Δ ${delta} pp) — behåll mall utan AI`,
    delta_pp: delta,
    a_rate_48h: a.rate_48h,
    b_rate_48h: b.rate_48h,
  };
}

module.exports = {
  FIRST_SUCCESS_FUNNEL_STEPS,
  getActivationFunnelCohorts,
  getActivationExperimentCohorts,
  getActivationChildAccessDiagnostics,
  computeAiGoNoGoVerdict,
  buildStepRates,
  buildStepConversions,
};
