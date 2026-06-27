'use strict';

const db = require('../src/lib/db');

/**
 * Families registered 48h–14d ago that have not completed onboarding.
 * @param {{ minAgeHours?: number, maxAgeDays?: number, limit?: number }} [opts]
 */
async function listStuckFamilies(opts = {}) {
  const minAgeHours = opts.minAgeHours ?? 48;
  const maxAgeDays = opts.maxAgeDays ?? 14;
  const limit = Math.min(opts.limit ?? 100, 500);

  const { rows } = await db.query(
    `SELECT
       f.id AS family_id,
       f.name AS family_name,
       f.created_at,
       COUNT(DISTINCT c.id)::int AS child_count,
       COALESCE(s.activation_variant, 'legacy') AS activation_variant,
       s.schema_saved_at,
       s.activation_nudge_sent_at,
       BOOL_OR(p.onboarding_completed) AS onboarding_completed,
       EXISTS (
         SELECT 1 FROM analytics_events ae
         WHERE ae.family_id = f.id AND ae.event_type = 'activation_onboarding_started'
       ) AS act1_started,
       EXISTS (
         SELECT 1 FROM analytics_events ae
         WHERE ae.family_id = f.id AND ae.event_type = 'funnel_onboarding_started'
       ) AS legacy_onboarding_started,
       EXISTS (
         SELECT 1 FROM login_event le WHERE le.family_id = f.id
       ) AS has_login
     FROM family f
     JOIN parent p ON p.family_id = f.id
     LEFT JOIN child c ON c.family_id = f.id
     LEFT JOIN family_activation_state s ON s.family_id = f.id
     WHERE f.archived_at IS NULL
       AND f.created_at >= NOW() - ($2::int * interval '1 day')
       AND f.created_at <= NOW() - ($1::int * interval '1 hour')
     GROUP BY f.id, f.name, f.created_at, s.activation_variant, s.schema_saved_at, s.activation_nudge_sent_at
     HAVING NOT BOOL_OR(p.onboarding_completed)
     ORDER BY f.created_at DESC
     LIMIT $3`,
    [minAgeHours, maxAgeDays, limit]
  );

  return rows.map((row) => ({
    familyId: row.family_id,
    familyName: row.family_name,
    createdAt: row.created_at,
    childCount: row.child_count,
    activationVariant: row.activation_variant,
    schemaSavedAt: row.schema_saved_at,
    nudgeSentAt: row.activation_nudge_sent_at,
    act1Started: row.act1_started,
    legacyOnboardingStarted: row.legacy_onboarding_started,
    hasLogin: row.has_login,
    stuckReason: row.child_count > 0 && !row.schema_saved_at
      ? 'child_without_schema'
      : !row.act1_started && !row.legacy_onboarding_started
        ? 'never_opened_onboarding'
        : !row.schema_saved_at
          ? 'onboarding_no_schema'
          : 'incomplete_onboarding',
  }));
}

module.exports = { listStuckFamilies };
