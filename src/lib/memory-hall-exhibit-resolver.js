'use strict';

const universeDb = require('../../db/child-universe');
const db = require('./db');

/** Cap visible memories — pride without trophy-wall spam (BL-012). */
const MAX_PRIDE_EXHIBITS = 6;
const MAX_REMEMBERED_GIFTS = 3;

async function getRememberedRewards(childId, limit) {
  const r = await db.query(
    `SELECT rr.created_at, r.name, r.icon
     FROM reward_redemption rr
     JOIN reward r ON r.id = rr.reward_id
     WHERE rr.child_id = $1 AND rr.status IN ('approved', 'auto')
     ORDER BY rr.created_at DESC
     LIMIT $2`,
    [childId, limit]
  );
  return r.rows;
}

/**
 * Resolve child memories for Memory Hall — moments, not metrics.
 * No counts, streaks, or leaderboard data in output.
 */
async function resolveExhibitMemories(childId) {
  const [achievements, gifts] = await Promise.all([
    universeDb.getChildAchievements(childId),
    getRememberedRewards(childId, MAX_REMEMBERED_GIFTS),
  ]);

  const exhibits = [];

  for (const row of achievements.slice(0, MAX_PRIDE_EXHIBITS)) {
    exhibits.push({
      slot_id: `proud_${row.slug}`,
      slot_type: 'proud_moment',
      label_sv: row.name,
      visual_token: null,
      content: {
        kind: 'proud_moment',
        emoji: row.emoji || '⭐',
        title: row.name,
      },
    });
  }

  for (const row of gifts) {
    if (exhibits.length >= MAX_PRIDE_EXHIBITS) break;
    exhibits.push({
      slot_id: `gift_${new Date(row.created_at).getTime()}`,
      slot_type: 'remembered_gift',
      label_sv: row.name,
      visual_token: null,
      content: {
        kind: 'remembered_gift',
        emoji: row.icon || '🎁',
        title: row.name,
      },
    });
  }

  return exhibits;
}

module.exports = {
  MAX_PRIDE_EXHIBITS,
  resolveExhibitMemories,
};
