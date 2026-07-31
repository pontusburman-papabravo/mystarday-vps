'use strict';

/**
 * Resolve default_reward.id for registration seeds (provenance for safe display localization).
 * Never matches name alone — requires icon + star_cost, and name when multiple rows share icon/cost.
 * @param {import('pg').PoolClient} client
 * @param {{ icon: string, star_cost: number, name: string }} reward
 * @returns {Promise<string|null>}
 */
async function lookupDefaultRewardIdForSeed(client, reward) {
  const icon = reward.icon || '🎁';
  const starCost = reward.star_cost;
  const name = reward.name;
  if (starCost == null || !name) return null;

  const exact = await client.query(
    `SELECT id FROM default_reward WHERE icon = $1 AND star_cost = $2 AND name = $3 LIMIT 1`,
    [icon, starCost, name]
  );
  if (exact.rows[0]) return exact.rows[0].id;

  const byIconCost = await client.query(
    `SELECT id FROM default_reward WHERE icon = $1 AND star_cost = $2`,
    [icon, starCost]
  );
  if (byIconCost.rows.length === 1) return byIconCost.rows[0].id;

  return null;
}

module.exports = {
  lookupDefaultRewardIdForSeed,
};
