'use strict';

const db = require('../src/lib/db');

function q(client) {
  if (!client) return db;
  if (typeof client === 'function') return { query: client };
  return client;
}

async function unlockNode({
  childId,
  familyId,
  worldSlug,
  nodeId,
  nodeType,
  packConfigKey,
  metadata = {},
}, client) {
  const query = q(client);
  const result = await query.query(
    `INSERT INTO child_progression_node
       (child_id, family_id, world_slug, node_id, node_type, pack_config_key, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (child_id, node_id) DO NOTHING
     RETURNING id`,
    [childId, familyId, worldSlug, nodeId, nodeType, packConfigKey, JSON.stringify(metadata)]
  );
  return Boolean(result.rows[0]);
}

async function listUnlockedNodes(childId, client) {
  const query = q(client);
  const result = await query.query(
    `SELECT world_slug, node_id, node_type, pack_config_key, metadata, unlocked_at
     FROM child_progression_node
     WHERE child_id = $1
     ORDER BY unlocked_at ASC`,
    [childId]
  );
  return result.rows;
}

async function storePendingFeedback({
  childId,
  familyId,
  idempotencyKey,
  feedbackType,
  payload,
  dailyLogItemId = null,
}, client) {
  const query = q(client);
  await query.query(
    `INSERT INTO progression_feedback
       (child_id, family_id, idempotency_key, feedback_type, payload, daily_log_item_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (idempotency_key) DO NOTHING`,
    [childId, familyId, idempotencyKey, feedbackType, JSON.stringify(payload), dailyLogItemId]
  );
}

async function getPendingFeedback(childId, idempotencyKey, client) {
  const query = q(client);
  const result = await query.query(
    `SELECT payload FROM progression_feedback
     WHERE child_id = $1 AND idempotency_key = $2
     LIMIT 1`,
    [childId, idempotencyKey]
  );
  return result.rows[0]?.payload || null;
}

async function getFeedbackForCompletion(childId, dailyLogItemId, client) {
  const query = q(client);
  const result = await query.query(
    `SELECT payload, feedback_type
     FROM progression_feedback
     WHERE child_id = $1 AND daily_log_item_id = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [childId, dailyLogItemId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return { ...row.payload, feedback_type: row.feedback_type };
}

async function enqueueEvent({
  childId,
  familyId,
  eventType,
  idempotencyKey,
  payload = {},
}, client) {
  const query = q(client);

  let insertResult;
  try {
    insertResult = await query.query(
      `INSERT INTO progression_event_queue
         (child_id, family_id, event_type, idempotency_key, payload)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (idempotency_key) DO NOTHING
       RETURNING id, processed_at`,
      [childId, familyId, eventType, idempotencyKey, JSON.stringify(payload)]
    );
  } catch (err) {
    if (err.code !== '23505') throw err;
    insertResult = { rows: [] };
  }

  if (insertResult.rows[0]) {
    return {
      inserted: true,
      replayed: false,
      pending: true,
      eventId: insertResult.rows[0].id,
    };
  }

  const existing = await query.query(
    `SELECT id, processed_at FROM progression_event_queue
     WHERE idempotency_key = $1 LIMIT 1`,
    [idempotencyKey]
  );
  const row = existing.rows[0];
  if (!row) {
    throw new Error(`[progression] enqueue conflict without row for ${idempotencyKey}`);
  }

  return {
    inserted: false,
    replayed: Boolean(row.processed_at),
    pending: !row.processed_at,
    eventId: row.id,
  };
}

async function markEventProcessed(idempotencyKey, client) {
  const query = q(client);
  await query.query(
    `UPDATE progression_event_queue
     SET processed_at = now()
     WHERE idempotency_key = $1`,
    [idempotencyKey]
  );
}

async function listPendingEvents(childId, client) {
  const query = q(client);
  const result = await query.query(
    `SELECT id, family_id, event_type, idempotency_key, payload
     FROM progression_event_queue
     WHERE child_id = $1 AND processed_at IS NULL
     ORDER BY created_at ASC`,
    [childId]
  );
  return result.rows.map((r) => ({
    ...r,
    payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
  }));
}

module.exports = {
  unlockNode,
  listUnlockedNodes,
  storePendingFeedback,
  getPendingFeedback,
  getFeedbackForCompletion,
  enqueueEvent,
  markEventProcessed,
  listPendingEvents,
};
