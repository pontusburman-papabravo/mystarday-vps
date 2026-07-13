'use strict';

/**
 * ACT-1 onboarding handoff film — music + text (no voiceover).
 */

module.exports = {
  name: '1809370000000_activation_onboarding_handoff_film_flag',

  up: async (client) => {
    await client.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, true, $2)
       ON CONFLICT (key) DO UPDATE SET enabled = true`,
      ['activation_onboarding_handoff_film_v1', 'ACT-1 handoff film after schema save (music + text)']
    );
  },

  down: async (client) => {
    await client.query(
      `DELETE FROM feature_flag WHERE key = $1`,
      ['activation_onboarding_handoff_film_v1']
    );
  },
};
