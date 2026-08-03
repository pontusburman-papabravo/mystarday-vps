'use strict';

/**
 * Prompt 1A — unified Day-0 / First Success coach (default OFF, server-enforced).
 */

module.exports = {
  name: '1810150000000_activation_first_success_v1_flag',

  up: async (client) => {
    await client.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, false, $2)
       ON CONFLICT (key) DO NOTHING`,
      [
        'activation_first_success_v1',
        'Day-0 onboarding + canonical Journey-first Hem coach until first_success (Prompt 1A)',
      ]
    );
  },

  down: async (client) => {
    await client.query('DELETE FROM feature_flag WHERE key = $1', ['activation_first_success_v1']);
  },
};
