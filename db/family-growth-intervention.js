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
       claimed_at, sent_by, subject_snapshot, body_version, idempotency_key,
       body_html_snapshot, recipient_email
     ) VALUES ($1, $2, $3, 'email', $4, NOW(), $5, $6, $7, $8, $9, $10)
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
      row.bodyHtmlSnapshot || null,
      row.recipientEmail || null,
    ]
  );
  return rows[0] || null;
}

async function markInterventionSent(interventionId, extra = {}, client = db) {
  const queryFn = client.query ? client.query.bind(client) : db.query;
  const providerEmailId = extra.providerEmailId || null;
  const { rows } = await queryFn(
    `UPDATE family_growth_intervention
     SET status = $2,
         sent_at = NOW(),
         provider_email_id = COALESCE($4, provider_email_id)
     WHERE id = $1 AND status = $3
     RETURNING id, family_id, intervention_key, cohort, sent_at, subject_snapshot, body_version,
               provider_email_id, recipient_email, body_html_snapshot`,
    [interventionId, STATUS.sent, STATUS.pending, providerEmailId]
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

async function listStuckInterventionSends(opts = {}) {
  const interventionKey = opts.interventionKey || null;
  const bodyVersion = opts.bodyVersion || null;
  const { rows } = await db.query(
    `SELECT
       gi.id,
       gi.family_id,
       f.name AS family_name,
       gi.intervention_key,
       gi.cohort,
       gi.status,
       gi.sent_at,
       gi.subject_snapshot,
       gi.body_version,
       gi.body_html_snapshot,
       gi.recipient_email,
       gi.provider_email_id,
       gi.delivery_error,
       s.child_access_completed_at,
       s.first_completion_at,
       nes.delivered_at,
       nes.first_opened_at,
       nes.first_clicked_at,
       nes.open_count,
       nes.click_count,
       nes.last_click_url
     FROM family_growth_intervention gi
     JOIN family f ON f.id = gi.family_id
     LEFT JOIN family_activation_state s ON s.family_id = gi.family_id
     LEFT JOIN newsletter_email_send nes
       ON nes.resend_email_id IS NOT NULL
      AND nes.resend_email_id = gi.provider_email_id
     WHERE gi.status = $3
       AND ($1::text IS NULL OR gi.intervention_key = $1)
       AND ($2::text IS NULL OR gi.body_version = $2)
     ORDER BY gi.sent_at DESC NULLS LAST
     LIMIT 200`,
    [interventionKey, bodyVersion, STATUS.sent]
  );

  const followUps = await listFollowUpsForSends(rows);

  return rows.map((row) => {
    const sentAt = row.sent_at ? new Date(row.sent_at) : null;
    const accessAt = row.child_access_completed_at
      ? new Date(row.child_access_completed_at)
      : null;
    const progressed = Boolean(
      sentAt && accessAt && accessAt.getTime() >= sentAt.getTime()
    );
    const hoursToAccess = progressed
      ? Math.round((accessAt.getTime() - sentAt.getTime()) / 3600000)
      : null;
    return {
      id: row.id,
      familyId: row.family_id,
      familyName: row.family_name,
      interventionKey: row.intervention_key,
      cohort: row.cohort,
      sentAt: row.sent_at,
      subject: row.subject_snapshot,
      bodyVersion: row.body_version,
      bodyHtml: row.body_html_snapshot,
      recipientEmail: row.recipient_email,
      providerEmailId: row.provider_email_id,
      deliveryError: row.delivery_error || null,
      bounced: String(row.delivery_error || '').toLowerCase().includes('bounce'),
      deliveredAt: row.delivered_at,
      openedAt: row.first_opened_at,
      clickedAt: row.first_clicked_at,
      openCount: row.open_count || 0,
      clickCount: row.click_count || 0,
      lastClickUrl: row.last_click_url || null,
      childAccessAt: row.child_access_completed_at,
      progressed,
      hoursToAccess,
      followUp: followUps.get(row.id) || [],
    };
  });
}

async function listFollowUpsForSends(sends) {
  const map = new Map();
  if (!sends.length) return map;
  const familyIds = sends.map((s) => s.family_id);
  const emails = sends.map((s) => (s.recipient_email || '').toLowerCase().trim()).filter(Boolean);
  const { rows } = await db.query(
    `SELECT id, family_id, email, created_at, message_type, status,
            left(message, 240) AS preview
     FROM contact_message
     WHERE family_id = ANY($1::uuid[])
        OR ($2::text[] != '{}'::text[] AND lower(trim(email)) = ANY($2::text[]))
     ORDER BY created_at DESC
     LIMIT 500`,
    [familyIds, emails]
  );
  for (const send of sends) {
    const sentAt = send.sent_at ? new Date(send.sent_at).getTime() : 0;
    const recipient = String(send.recipient_email || '').toLowerCase().trim();
    const matches = rows.filter((cm) => {
      const at = new Date(cm.created_at).getTime();
      if (at < sentAt) return false;
      if (cm.family_id && cm.family_id === send.family_id) return true;
      return recipient && String(cm.email || '').toLowerCase().trim() === recipient;
    }).map((cm) => ({
      id: cm.id,
      createdAt: cm.created_at,
      type: cm.message_type,
      status: cm.status,
      preview: cm.preview,
    }));
    map.set(send.id, matches);
  }
  return map;
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
  listStuckInterventionSends,
};
