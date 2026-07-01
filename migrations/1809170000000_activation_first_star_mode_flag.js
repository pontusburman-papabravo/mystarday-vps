'use strict';

/**
 * PR 1 — First Star Mode (activation_first_star_mode_v1), default OFF.
 */

module.exports = {
  name: '1809170000000_activation_first_star_mode_flag',

  up: async (client) => {
    await client.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, false, $2)
       ON CONFLICT (key) DO NOTHING`,
      ['activation_first_star_mode_v1', 'First Star Mode — single NU activity for 0-completion children']
    );
  },

  down: async (client) => {
    await client.query('DELETE FROM feature_flag WHERE key = $1', ['activation_first_star_mode_v1']);
  },
};
