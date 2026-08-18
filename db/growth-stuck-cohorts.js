'use strict';

const db = require('../src/lib/db');
const { excludeInternalQaWhere } = require('../config/internal-qa-families');
const {
  COHORTS,
  FOLLOW_UP,
  mapGrowthStuckFamily,
} = require('../src/lib/growth-stuck-work-queue');

/**
 * List stuck families across activation cohorts (48h–14d).
 * Admin work queue — no auto-send. Excludes QA/test families by default.
 *
 * @param {{
 *   cohort?: string,
 *   minAgeHours?: number,
 *   maxAgeDays?: number,
 *   limit?: number,
 *   includeInternalQa?: boolean
 * }} [opts]
 */
async function listGrowthStuckCohorts(opts = {}) {
  const minAgeHours = opts.minAgeHours ?? 48;
  const maxAgeDays = opts.maxAgeDays ?? 14;
  const limit = Math.min(opts.limit ?? 100, 500);
  const includeInternalQa = opts.includeInternalQa === true;
  const cohortFilter = opts.cohort && COHORTS[opts.cohort] ? opts.cohort : null;

  const { rows } = await db.query(
    `WITH base AS (
       SELECT
         f.id AS family_id,
         f.name AS family_name,
         f.created_at,
         f.preferred_locale AS locale,
         BOOL_OR(p.onboarding_completed) AS onboarding_completed,
         s.child_created_at,
         s.schema_saved_at,
         s.child_access_completed_at,
         s.first_completion_at,
         s.p0_activated_at,
         s.activation_nudge_sent_at,
         a.source AS acquisition_source,
         a.medium AS acquisition_medium,
         a.campaign AS acquisition_campaign,
         a.platform AS acquisition_platform,
         a.referral_code AS acquisition_referral_code,
         (
           SELECT ae.event_type
           FROM analytics_events ae
           WHERE ae.family_id = f.id
           ORDER BY ae.created_at DESC
           LIMIT 1
         ) AS last_event_type,
         (
           SELECT ae.created_at
           FROM analytics_events ae
           WHERE ae.family_id = f.id
           ORDER BY ae.created_at DESC
           LIMIT 1
         ) AS last_event_at,
         EXISTS (
           SELECT 1 FROM analytics_events ae
           WHERE ae.family_id = f.id
             AND ae.event_type IN (
               'child_login_failed',
               'child_pin_lockout',
               'api_error_core_flow'
             )
             AND ae.created_at > NOW() - INTERVAL '14 days'
         ) AS has_core_flow_error,
         (
           SELECT MAX(le.occurred_at)
           FROM login_event le
           WHERE le.family_id = f.id
         ) AS last_login_at
       FROM family f
       JOIN parent p ON p.family_id = f.id
       LEFT JOIN family_activation_state s ON s.family_id = f.id
       LEFT JOIN family_acquisition_attribution a ON a.family_id = f.id
       WHERE f.archived_at IS NULL
         AND f.created_at >= NOW() - ($2::int * interval '1 day')
         AND f.created_at <= NOW() - ($1::int * interval '1 hour')
         ${includeInternalQa ? '' : `AND ${excludeInternalQaWhere('f')}`}
       GROUP BY
         f.id, f.name, f.created_at, f.preferred_locale,
         s.child_created_at, s.schema_saved_at, s.child_access_completed_at,
         s.first_completion_at, s.p0_activated_at, s.activation_nudge_sent_at,
         a.source, a.medium, a.campaign, a.platform, a.referral_code
     ),
     classified AS (
       SELECT
         b.*,
         CASE
           WHEN b.has_core_flow_error THEN 'core_flow_errors'
           WHEN NOT COALESCE(b.onboarding_completed, false) THEN 'onboarding_incomplete'
           WHEN b.schema_saved_at IS NOT NULL AND b.child_access_completed_at IS NULL
             THEN 'schema_no_child_login'
           WHEN b.child_access_completed_at IS NOT NULL AND b.first_completion_at IS NULL
             THEN 'login_no_completion'
           WHEN b.first_completion_at IS NOT NULL
             AND (b.last_login_at IS NULL OR b.last_login_at < NOW() - INTERVAL '7 days')
             AND b.first_completion_at < NOW() - INTERVAL '3 days'
             THEN 'completion_no_return'
           ELSE NULL
         END AS blocking_step
       FROM base b
     )
     SELECT *
     FROM classified
     WHERE blocking_step IS NOT NULL
       AND ($4::text IS NULL OR blocking_step = $4)
     ORDER BY
       CASE blocking_step
         WHEN 'schema_no_child_login' THEN COALESCE(schema_saved_at, created_at)
         WHEN 'login_no_completion' THEN COALESCE(child_access_completed_at, created_at)
         WHEN 'completion_no_return' THEN COALESCE(first_completion_at, created_at)
         WHEN 'core_flow_errors' THEN COALESCE(last_event_at, created_at)
         ELSE created_at
       END ASC
     LIMIT $3`,
    [minAgeHours, maxAgeDays, limit, cohortFilter]
  );

  return rows.map((row) => mapGrowthStuckFamily(row));
}

/**
 * Segment counts for admin work queue (no PII beyond counts).
 */
async function summarizeGrowthStuckCohorts(opts = {}) {
  const families = await listGrowthStuckCohorts({ ...opts, limit: 500 });
  const counts = {};
  for (const key of Object.keys(COHORTS)) counts[key] = 0;
  for (const f of families) {
    if (counts[f.blockingStep] != null) counts[f.blockingStep] += 1;
  }
  return {
    generatedAt: new Date().toISOString(),
    total: families.length,
    counts,
    autoSendAllowed: false,
  };
}

module.exports = {
  COHORTS,
  FOLLOW_UP,
  listGrowthStuckCohorts,
  summarizeGrowthStuckCohorts,
};
