'use strict';

const db = require('../src/lib/db');

const STATUS = Object.freeze({
  pending: 'pending',
  sent: 'sent',
  skipped: 'skipped',
  failed: 'failed',
  unknown: 'unknown',
});

const PENDING_STALE_MINUTES = 15;

function buildIdempotencyKey(familyId, interventionKey) {
  return `stuck-intervention/${familyId}/${interventionKey}`;
}

async function getLatestSentForFamily(familyId) {
  const { rows } = await db.query(
    `SELECT intervention_key, cohort, sent_at, subject_snapshot, body_version
     FROM family_growth_intervention
     WHERE family_id = $1 AND status = $2
     ORDER BY sent_at DESC NULLS LAST, created_at DESC
     LIMIT 1`,
    [familyId, STATUS.sent]
  );
  return rows[0] || null;
}

async function getSentIntervention(familyId, interventionKey) {
  const { rows } = await db.query(
    `SELECT id, intervention_key, cohort, sent_at, subject_snapshot, body_version, sent_by
     FROM family_growth_intervention
     WHERE family_id = $1 AND intervention_key = $2 AND status = $3
     LIMIT 1`,
    [familyId, interventionKey, STATUS.sent]
  );
  return rows[0] || null;
}

async function getPendingIntervention(familyId, interventionKey) {
  const { rows } = await db.query(
    `SELECT id, intervention_key, cohort, claimed_at, subject_snapshot, body_version, sent_by
     FROM family_growth_intervention
     WHERE family_id = $1 AND intervention_key = $2 AND status = $3
     LIMIT 1`,
    [familyId, interventionKey, STATUS.pending]
  );
  return rows[0] || null;
}

async function getLatestSentForFamilies(familyIds) {
  if (!familyIds.length) return new Map();
  const { rows } = await db.query(
    `SELECT DISTINCT ON (family_id)
       family_id, intervention_key, cohort, sent_at, subject_snapshot
     FROM family_growth_intervention
     WHERE family_id = ANY($1::uuid[]) AND status = $2
     ORDER BY family_id, sent_at DESC`,
    [familyIds, STATUS.sent]
  );
  const map = new Map();
  for (const row of rows) {
    map.set(row.family_id, row);
  }
  return map;
}

async function listInterventionHistoryForFamilies(familyIds) {
  if (!familyIds.length) return new Map();
  const { rows } = await db.query(
    `SELECT DISTINCT ON (family_id)
       family_id, intervention_key, cohort, status, sent_at, skipped_at, subject_snapshot
     FROM family_growth_intervention
     WHERE family_id = ANY($1::uuid[])
     ORDER BY family_id,
       CASE status WHEN 'sent' THEN 0 ELSE 1 END,
       COALESCE(sent_at, skipped_at, created_at) DESC`,
    [familyIds]
  );
  const map = new Map();
  for (const row of rows) {
    map.set(row.family_id, row);
  }
  return map;
}

async function getLastGrowthEmailAt(familyId, client = db) {
  const queryFn = client.query ? client.query.bind(client) : db.query;
  const { rows } = await queryFn(
    `SELECT GREATEST(
       (SELECT MAX(s.activation_nudge_sent_at) FROM family_activation_state s WHERE s.family_id = $1),
       (SELECT MAX(gi.sent_at) FROM family_growth_intervention gi
         WHERE gi.family_id = $1 AND gi.status = 'sent')
     ) AS last_growth_email_at`,
    [familyId]
  );
  return rows[0]?.last_growth_email_at || null;
}

async function expireStalePendingInterventions(familyId, interventionKey, client = db) {
  const queryFn = client.query ? client.query.bind(client) : db.query;
  await queryFn(
    `UPDATE family_growth_intervention
     SET status = $4,
         delivery_error = COALESCE(delivery_error, $5)
     WHERE family_id = $1
       AND intervention_key = $2
       AND status = $3
       AND claimed_at < NOW() - ($6::int * interval '1 minute')`,
    [
      familyId,
      interventionKey,
      STATUS.pending,
      STATUS.failed,
      'stale_pending_expired',
      PENDING_STALE_MINUTES,
    ]
  );
}

/**
 * Atomically claim a pending delivery slot (conflict-safe vs sent + in-flight pending).
 * @param {object} row
 * @param {import('pg').PoolClient} [client]
 */
async function claimPendingIntervention(row, client = db) {
  const queryFn = client.query ? client.query.bind(client) : db.query;
  const idempotencyKey = row.idempotencyKey || buildIdempotencyKey(row.familyId, row.interventionKey);

  await expireStalePendingInterventions(row.familyId, row.interventionKey, client);

  const { rows } = await queryFn(
    `INSERT INTO family_growth_intervention (
       family_id, cohort, intervention_key, channel, status,
       claimed_at, sent_by, subject_snapshot, body_version, idempotency_key
     ) VALUES ($1, $2, $3, 'email', $4, NOW(), $5, $6, $7, $8)
     ON CONFLICT (family_id, intervention_key)
       WHERE (status IN ('sent', 'pending'))
     DO NOTHING
     RETURNING id, family_id, intervention_key, cohort, claimed_at, subject_snapshot, body_version, idempotency_key`,
    [
      row.familyId,
      row.cohort,
      row.interventionKey,
      STATUS.pending,
      row.sentBy,
      row.subjectSnapshot,
      row.bodyVersion,
      idempotencyKey,
    ]
  );
  return rows[0] || null;
}

async function markInterventionSent(interventionId, client = db) {
  const queryFn = client.query ? client.query.bind(client) : db.query;
  const { rows } = await queryFn(
    `UPDATE family_growth_intervention
     SET status = $2, sent_at = NOW()
     WHERE id = $1 AND status = $3
     RETURNING id, family_id, intervention_key, cohort, sent_at, subject_snapshot, body_version`,
    [interventionId, STATUS.sent, STATUS.pending]
  );
  return rows[0] || null;
}

async function markInterventionFailed(interventionId, errorMessage, client = db) {
  const queryFn = client.query ? client.query.bind(client) : db.query;
  const { rows } = await queryFn(
    `UPDATE family_growth_intervention
     SET status = $2, delivery_error = $3
     WHERE id = $1 AND status = $4
     RETURNING id, family_id, intervention_key, status, delivery_error`,
    [interventionId, STATUS.failed, errorMessage, STATUS.pending]
  );
  return rows[0] || null;
}

async function markInterventionUnknown(interventionId, errorMessage, client = db) {
  const queryFn = client.query ? client.query.bind(client) : db.query;
  const { rows } = await queryFn(
    `UPDATE family_growth_intervention
     SET status = $2, delivery_error = $3
     WHERE id = $1 AND status = $4
     RETURNING id, family_id, intervention_key, status, delivery_error`,
    [interventionId, STATUS.unknown, errorMessage, STATUS.pending]
  );
  return rows[0] || null;
}

async function insertSkippedIntervention(row) {
  const { rows } = await db.query(
    `INSERT INTO family_growth_intervention (
       family_id, cohort, intervention_key, channel, status,
       skipped_at, skip_reason, sent_by, subject_snapshot, body_version
     ) VALUES ($1, $2, $3, 'email', 'skipped', NOW(), $4, $5, $6, $7)
     RETURNING id, family_id, intervention_key, cohort, skipped_at, skip_reason`,
    [
      row.familyId,
      row.cohort,
      row.interventionKey,
      row.skipReason,
      row.sentBy,
      row.subjectSnapshot,
      row.bodyVersion,
    ]
  );
  return rows[0] || null;
}

module.exports = {
  STATUS,
  PENDING_STALE_MINUTES,
  buildIdempotencyKey,
  getLatestSentForFamily,
  getLatestSentForFamilies,
  getSentIntervention,
  getPendingIntervention,
  listInterventionHistoryForFamilies,
  getLastGrowthEmailAt,
  expireStalePendingInterventions,
  claimPendingIntervention,
  markInterventionSent,
  markInterventionFailed,
  markInterventionUnknown,
  insertSkippedIntervention,
};
