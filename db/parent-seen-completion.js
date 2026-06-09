/**
 * Parent seen completion — tracks which daily_log_items a parent has seen (aha moment).
 */

const db = require('../src/lib/db');

async function markSeen(parentId, dailyLogItemId) {
  await db.query(
    `INSERT INTO parent_seen_completion (parent_id, daily_log_item_id)
     VALUES ($1, $2)
     ON CONFLICT (parent_id, daily_log_item_id) DO NOTHING`,
    [parentId, dailyLogItemId]
  );
}

async function getSeenItemIds(parentId, itemIds) {
  if (!itemIds.length) return new Set();
  const result = await db.query(
    `SELECT daily_log_item_id FROM parent_seen_completion
     WHERE parent_id = $1 AND daily_log_item_id = ANY($2::uuid[])`,
    [parentId, itemIds]
  );
  return new Set(result.rows.map((r) => r.daily_log_item_id));
}

async function getUnseenCompletions(parentId, familyId, since) {
  const result = await db.query(
    `SELECT dli.id AS daily_log_item_id,
            dli.name AS activity_name,
            dli.completed_at,
            c.id AS child_id,
            c.name AS child_name
     FROM daily_log_item dli
     JOIN daily_log dl ON dl.id = dli.daily_log_id
     JOIN child c ON c.id = dl.child_id
     LEFT JOIN parent_seen_completion psc
       ON psc.parent_id = $1 AND psc.daily_log_item_id = dli.id
     WHERE c.family_id = $2
       AND dli.completed = true
       AND dli.completed_at >= $3
       AND psc.parent_id IS NULL
     ORDER BY dli.completed_at ASC`,
    [parentId, familyId, since]
  );
  return result.rows;
}

async function hasChildCompletionSince(familyId, since) {
  const result = await db.query(
    `SELECT 1
     FROM daily_log_item dli
     JOIN daily_log dl ON dl.id = dli.daily_log_id
     JOIN child c ON c.id = dl.child_id
     WHERE c.family_id = $1
       AND dli.completed = true
       AND dli.completed_at >= $2
     LIMIT 1`,
    [familyId, since]
  );
  return result.rows.length > 0;
}

async function countChildCompletionsSince(familyId, since) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS cnt
     FROM daily_log_item dli
     JOIN daily_log dl ON dl.id = dli.daily_log_id
     JOIN child c ON c.id = dl.child_id
     WHERE c.family_id = $1
       AND dli.completed = true
       AND dli.completed_at >= $2`,
    [familyId, since]
  );
  return result.rows[0]?.cnt || 0;
}

module.exports = {
  markSeen,
  getSeenItemIds,
  getUnseenCompletions,
  hasChildCompletionSince,
  countChildCompletionsSince,
};
