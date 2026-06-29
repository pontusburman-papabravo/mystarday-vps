'use strict';

/**
 * Auto-set a child's first reward goal when none exists.
 * Picks the cheapest active reward visible to the child (fail-open if none).
 */

const db = require('./db');

/**
 * @param {string} childId
 * @returns {Promise<{ autoSet: boolean, reward?: { id: string, name: string, icon: string, star_cost: number } }>}
 */
async function ensureDefaultChildGoal(childId) {
  const existing = await db.query(
    `SELECT id FROM child_reward_goal WHERE child_id = $1 AND status = 'active' LIMIT 1`,
    [childId]
  );
  if (existing.rows.length > 0) {
    return { autoSet: false };
  }

  const childResult = await db.query('SELECT family_id FROM child WHERE id = $1', [childId]);
  if (childResult.rows.length === 0) {
    return { autoSet: false };
  }
  const familyId = childResult.rows[0].family_id;

  const rewardResult = await db.query(
    `SELECT id, name, icon, star_cost FROM reward
     WHERE family_id = $1 AND is_active = true
       AND (visible_to_children IS NULL OR $2 = ANY(visible_to_children))
     ORDER BY star_cost ASC, sort_order ASC NULLS LAST, created_at ASC
     LIMIT 1`,
    [familyId, childId]
  );
  if (rewardResult.rows.length === 0) {
    return { autoSet: false };
  }

  const reward = rewardResult.rows[0];
  await db.query(
    `INSERT INTO child_reward_goal (child_id, reward_id, status) VALUES ($1, $2, 'active')`,
    [childId, reward.id]
  );

  return {
    autoSet: true,
    reward: {
      id: reward.id,
      name: reward.name,
      icon: reward.icon,
      star_cost: reward.star_cost,
    },
  };
}

module.exports = { ensureDefaultChildGoal };
