/**
 * db/parent-seen-completion.js
 * Tracks which daily_log completions a parent has seen (aha-moment dedup).
 */

const db = require('../src/lib/db');

async function markSeen(parentId, dailyLogItemId, client = db) {
  const result = await client.query(
    `INSERT INTO parent_seen_completion (parent_id, daily_log_item_id)
     VALUES ($1, $2)
     ON CONFLICT (parent_id, daily_log_item_id) DO NOTHING
     RETURNING *`,
    [parentId, dailyLogItemId]
  );
  return result.rows[0] || null;
}

async function hasSeen(parentId, dailyLogItemId, client = db) {
  const result = await client.query(
    `SELECT 1 FROM parent_seen_completion
     WHERE parent_id = $1 AND daily_log_item_id = $2
     LIMIT 1`,
    [parentId, dailyLogItemId]
  );
  return result.rows.length > 0;
}

async function verifyFamilyItemAccess(parentId, familyId, dailyLogItemId, client = db) {
  const result = await client.query(
    `SELECT dli.id
     FROM daily_log_item dli
     JOIN daily_log dl ON dl.id = dli.daily_log_id
     JOIN child c ON c.id = dl.child_id
     JOIN parent_child pc ON pc.child_id = c.id AND pc.parent_id = $1
     WHERE c.family_id = $2 AND dli.id = $3
     LIMIT 1`,
    [parentId, familyId, dailyLogItemId]
  );
  return result.rows[0] || null;
}

module.exports = {
  markSeen,
  hasSeen,
  verifyFamilyItemAccess,
};
