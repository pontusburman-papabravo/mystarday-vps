'use strict';

/**
 * Morgonhuset playable slice — feature flag default OFF.
 */

module.exports = {
  name: '1809120000000_morgonhus_playable',

  up: async (client) => {
    await client.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, false, $2)
       ON CONFLICT (key) DO NOTHING`,
      [
        'morgonhus_playable_v1',
        'Morgonhuset — first playable morning house scene for child Min värld (default OFF)',
      ]
    );
  },

  down: async (client) => {
    await client.query(`DELETE FROM feature_flag WHERE key = 'morgonhus_playable_v1'`);
  },
};
