'use strict';

const db = require('../src/lib/db');

async function getState(familyId) {
  const { rows } = await db.query(
    `SELECT family_id, blocking_step, help_type, stuck_detected_at,
            system_help_shown_at, system_help_engaged_at, support_requested_at,
            next_milestone_at, progression_outcome, updated_at
     FROM family_system_help_state
     WHERE family_id = $1`,
    [familyId]
  );
  return rows[0] || null;
}

async function upsertDetected(familyId, blockingStep, helpType, stuckDetectedAt) {
  const { rows } = await db.query(
    `INSERT INTO family_system_help_state (
       family_id, blocking_step, help_type, stuck_detected_at, updated_at
     ) VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (family_id) DO UPDATE SET
       blocking_step = EXCLUDED.blocking_step,
       help_type = EXCLUDED.help_type,
       stuck_detected_at = CASE
         WHEN family_system_help_state.blocking_step IS DISTINCT FROM EXCLUDED.blocking_step
         THEN EXCLUDED.stuck_detected_at
         ELSE family_system_help_state.stuck_detected_at
       END,
       system_help_shown_at = CASE
         WHEN family_system_help_state.blocking_step IS DISTINCT FROM EXCLUDED.blocking_step
         THEN NULL
         ELSE family_system_help_state.system_help_shown_at
       END,
       system_help_engaged_at = CASE
         WHEN family_system_help_state.blocking_step IS DISTINCT FROM EXCLUDED.blocking_step
         THEN NULL
         ELSE family_system_help_state.system_help_engaged_at
       END,
       progression_outcome = CASE
         WHEN family_system_help_state.blocking_step IS DISTINCT FROM EXCLUDED.blocking_step
         THEN NULL
         ELSE family_system_help_state.progression_outcome
       END,
       next_milestone_at = CASE
         WHEN family_system_help_state.blocking_step IS DISTINCT FROM EXCLUDED.blocking_step
         THEN NULL
         ELSE family_system_help_state.next_milestone_at
       END,
       updated_at = now()
     RETURNING *`,
    [familyId, blockingStep, helpType, stuckDetectedAt]
  );
  return rows[0];
}

async function markShown(familyId, at = new Date()) {
  const { rows } = await db.query(
    `UPDATE family_system_help_state
     SET system_help_shown_at = COALESCE(system_help_shown_at, $2),
         updated_at = now()
     WHERE family_id = $1
     RETURNING *,
       (system_help_shown_at = $2) AS newly_shown`,
    [familyId, at]
  );
  const row = rows[0] || null;
  if (!row) return { row: null, newlyShown: false };
  return { row, newlyShown: Boolean(row.newly_shown) };
}

async function markEngaged(familyId, at = new Date()) {
  const { rows } = await db.query(
    `UPDATE family_system_help_state
     SET system_help_engaged_at = COALESCE(system_help_engaged_at, $2),
         updated_at = now()
     WHERE family_id = $1
     RETURNING *`,
    [familyId, at]
  );
  return rows[0] || null;
}

async function markSupportRequested(familyId, at = new Date()) {
  const { rows } = await db.query(
    `UPDATE family_system_help_state
     SET support_requested_at = COALESCE(support_requested_at, $2),
         updated_at = now()
     WHERE family_id = $1
     RETURNING *`,
    [familyId, at]
  );
  return rows[0] || null;
}

async function markProgression(familyId, milestoneAt, outcome) {
  const { rows } = await db.query(
    `UPDATE family_system_help_state
     SET next_milestone_at = COALESCE(next_milestone_at, $2),
         progression_outcome = CASE
           WHEN $3::text IS NULL THEN progression_outcome
           WHEN progression_outcome IS NULL THEN $3
           WHEN progression_outcome = 'no_progress'
             AND $3 IN ('progressed_24h', 'progressed_72h') THEN $3
           WHEN progression_outcome = 'progressed_72h' AND $3 = 'progressed_24h' THEN 'progressed_24h'
           ELSE progression_outcome
         END,
         updated_at = now()
     WHERE family_id = $1
     RETURNING *`,
    [familyId, milestoneAt, outcome]
  );
  return rows[0] || null;
}

async function listPendingNoProgressCandidates(cutoff) {
  const { rows } = await db.query(
    `SELECT family_id, blocking_step, help_type, system_help_shown_at
     FROM family_system_help_state
     WHERE system_help_shown_at IS NOT NULL
       AND system_help_shown_at < $1
       AND next_milestone_at IS NULL
       AND progression_outcome IS NULL`,
    [cutoff]
  );
  return rows;
}

async function markNoProgress(familyId) {
  const { rows } = await db.query(
    `UPDATE family_system_help_state
     SET progression_outcome = 'no_progress',
         updated_at = now()
     WHERE family_id = $1
       AND next_milestone_at IS NULL
       AND progression_outcome IS NULL
     RETURNING family_id, blocking_step, help_type, system_help_shown_at`,
    [familyId]
  );
  return rows[0] || null;
}

/**
 * Load family facts for stuck classification.
 * @param {string} familyId
 */
async function loadFamilyStuckFacts(familyId) {
  const { rows } = await db.query(
    `SELECT
       f.id AS family_id,
       f.created_at AS family_created_at,
       f.preferred_locale AS locale,
       BOOL_OR(p.onboarding_completed) AS onboarding_completed,
       s.schema_saved_at,
       s.child_access_completed_at,
       s.first_completion_at,
       (
         SELECT MAX(le.occurred_at)
         FROM login_event le
         WHERE le.family_id = f.id
       ) AS last_login_at,
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
         SELECT MAX(ae.created_at)
         FROM analytics_events ae
         WHERE ae.family_id = f.id
           AND ae.event_type IN (
             'child_login_failed',
             'child_pin_lockout',
             'api_error_core_flow'
           )
           AND ae.created_at > NOW() - INTERVAL '14 days'
       ) AS last_core_flow_error_at
     FROM family f
     JOIN parent p ON p.family_id = f.id
     LEFT JOIN family_activation_state s ON s.family_id = f.id
     WHERE f.id = $1 AND f.archived_at IS NULL
     GROUP BY f.id, f.created_at, f.preferred_locale,
              s.schema_saved_at, s.child_access_completed_at, s.first_completion_at`,
    [familyId]
  );
  return rows[0] || null;
}

module.exports = {
  getState,
  upsertDetected,
  markShown,
  markEngaged,
  markSupportRequested,
  markProgression,
  listPendingNoProgressCandidates,
  markNoProgress,
  loadFamilyStuckFacts,
};
