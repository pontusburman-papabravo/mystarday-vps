'use strict';

/**
 * Slim signup + event-first signup Journey (ADR journey-event-first-onboarding).
 * Default OFF — enable per family or via rollout script.
 */

module.exports = {
  name: '1809230000000_activation_signup_slim_flag',

  up: async (client) => {
    await client.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, false, $2)
       ON CONFLICT (key) DO NOTHING`,
      ['activation_signup_slim_v1', 'Slim signup (3 frågor → schema → Hem) + event-first Journey']
    );
  },

  down: async (client) => {
    await client.query('DELETE FROM feature_flag WHERE key = $1', ['activation_signup_slim_v1']);
  },
};
