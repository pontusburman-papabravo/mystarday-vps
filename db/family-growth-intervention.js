'use strict';

const db = require('../src/lib/db');

const STATUS = Object.freeze({
  sent: 'sent',
  skipped: 'skipped',
});

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
  const { rows } = await client.query(
    `SELECT GREATEST(
       (SELECT MAX(s.activation_nudge_sent_at) FROM family_activation_state s WHERE s.family_id = $1),
       (SELECT MAX(gi.sent_at) FROM family_growth_intervention gi
         WHERE gi.family_id = $1 AND gi.status = 'sent')
     ) AS last_growth_email_at`,
    [familyId]
  );
  return rows[0]?.last_growth_email_at || null;
}

/**
 * @param {object} row
 * @param {import('pg').PoolClient} [client]
 */
async function insertSentIntervention(row, client = db) {
  const queryFn = client.query ? client.query.bind(client) : db.query;
  const { rows } = await queryFn(
    `INSERT INTO family_growth_intervention (
       family_id, cohort, intervention_key, channel, status,
       sent_at, sent_by, subject_snapshot, body_version
     )
     SELECT $1, $2, $3, 'email', 'sent', NOW(), $4, $5, $6
     WHERE NOT EXISTS (
       SELECT 1 FROM family_growth_intervention gi
       WHERE gi.family_id = $1
         AND gi.intervention_key = $3
         AND gi.status = 'sent'
     )
     RETURNING id, family_id, intervention_key, cohort, sent_at, subject_snapshot, body_version`,
    [
      row.familyId,
      row.cohort,
      row.interventionKey,
      row.sentBy,
      row.subjectSnapshot,
      row.bodyVersion,
    ]
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
  getLatestSentForFamily,
  getLatestSentForFamilies,
  getSentIntervention,
  listInterventionHistoryForFamilies,
  getLastGrowthEmailAt,
  insertSentIntervention,
  insertSkippedIntervention,
};
