'use strict';

/**
 * Enable slim signup for all families (power-user paths remain in onboarding UI).
 * Journey coach requires family_journey_evaluator_enabled + family_journey_coach_v1 separately.
 */

module.exports = {
  name: '1809240000000_enable_signup_slim_flag',

  up: async (client) => {
    await client.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, true, $2)
       ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled`,
      ['activation_signup_slim_v1', 'Slim signup (3 frågor → schema → Hem) + event-first Journey']
    );
  },

  down: async (client) => {
    await client.query(
      `UPDATE feature_flag SET enabled = false WHERE key = $1`,
      ['activation_signup_slim_v1']
    );
  },
};
