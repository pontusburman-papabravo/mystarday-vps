'use strict';

const db = require('../src/lib/db');
const { ACTIVE_RELEASE_ID } = require('../src/lib/l1-governance-config');

async function ensureRelease(releaseId = ACTIVE_RELEASE_ID) {
  const { rows } = await db.query(
    `INSERT INTO l1_governance_release (release_id)
     VALUES ($1)
     ON CONFLICT (release_id) DO UPDATE SET updated_at = l1_governance_release.updated_at
     RETURNING release_id, started_at, state, updated_at`,
    [releaseId]
  );
  return rows[0];
}

async function getRelease(releaseId = ACTIVE_RELEASE_ID) {
  const { rows } = await db.query(
    `SELECT release_id, started_at, state, updated_at
     FROM l1_governance_release WHERE release_id = $1`,
    [releaseId]
  );
  return rows[0] || null;
}

async function setReleaseState(releaseId, state) {
  const { rows } = await db.query(
    `UPDATE l1_governance_release
     SET state = $2, updated_at = NOW()
     WHERE release_id = $1
     RETURNING release_id, started_at, state, updated_at`,
    [releaseId, state]
  );
  return rows[0];
}

async function insertDecision(row) {
  const { rows } = await db.query(
    `INSERT INTO l1_governance_decision (
       release_id, decision_type, log_line, answers, owner_label, parent_id
     ) VALUES ($1, $2, $3, $4::jsonb, $5, $6)
     RETURNING id, release_id, decision_type, log_line, answers, owner_label, created_at`,
    [
      row.release_id,
      row.decision_type,
      row.log_line,
      JSON.stringify(row.answers || {}),
      row.owner_label || null,
      row.parent_id || null,
    ]
  );
  return rows[0];
}

async function listDecisions(releaseId = ACTIVE_RELEASE_ID, limit = 20) {
  const { rows } = await db.query(
    `SELECT id, release_id, decision_type, log_line, answers, owner_label, created_at
     FROM l1_governance_decision
     WHERE release_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [releaseId, limit]
  );
  return rows;
}

async function getEngineMetrics7d() {
  const { rows } = await db.query(
    `SELECT event_type, COUNT(*)::int AS cnt
     FROM analytics_events
     WHERE created_at > NOW() - interval '7 days'
       AND event_type IN (
         'engine_coach_cta_click',
         'engine_authority_conflict',
         'readiness_action_click',
         'cta_invite_co_parent_clicked',
         'child_access_completed'
       )
     GROUP BY event_type`
  );
  const map = {};
  for (const row of rows) map[row.event_type] = row.cnt;
  return {
    coach_clicks_7d: map.engine_coach_cta_click || 0,
    conflicts_7d: map.engine_authority_conflict || 0,
    readiness_clicks_7d: map.readiness_action_click || 0,
    invite_clicks_7d: map.cta_invite_co_parent_clicked || 0,
    child_access_completed_7d: map.child_access_completed || 0,
  };
}

module.exports = {
  ensureRelease,
  getRelease,
  setReleaseState,
  insertDecision,
  listDecisions,
  getEngineMetrics7d,
};
