/**
 * Repeatable rewards: remove mistaken one-fulfilled-per-reward unique index
 * (introduced in an unreleased revision of 1810000000013).
 */
module.exports = {
  name: '1810000000014_drop_reward_fulfilled_unique',

  up: async (client) => {
    await client.query('DROP INDEX IF EXISTS idx_reward_redemption_one_fulfilled_per_reward');
  },

  down: async (client) => {
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_reward_redemption_one_fulfilled_per_reward
      ON reward_redemption (reward_id)
      WHERE status IN ('approved', 'auto')
    `);
  },
};
