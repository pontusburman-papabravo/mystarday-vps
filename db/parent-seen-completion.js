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

module.exports = {
  markSeen,
  hasSeen,
};
