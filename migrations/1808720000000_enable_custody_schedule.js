'use strict';

/**
 * Enable FEAT-1 boendeschema for all families (remove beta gate).
 */
module.exports = {
  name: '1808720000000_enable_custody_schedule',

  up: async (client) => {
    await client.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, true, $2)
       ON CONFLICT (key) DO UPDATE SET enabled = true`,
      ['custody_schedule_beta', 'FEAT-1 boendeschema (växelvis boende)']
    );
  },

  down: async (client) => {
    await client.query(
      `UPDATE feature_flag SET enabled = false WHERE key = $1`,
      ['custody_schedule_beta']
    );
  },
};
