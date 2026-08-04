'use strict';

/**
 * Global English availability (ADR-021).
 * Default OFF — merge/deploy safe; enable via feature_flag after smoke.
 */

module.exports = {
  name: '1810170000000_english_app_global_enabled_flag',

  up: async (client) => {
    await client.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, false, $2)
       ON CONFLICT (key) DO NOTHING`,
      [
        'english_app_global_enabled',
        'Global English availability: all families may select en-GB without per-family english_app allowlist',
      ]
    );
  },

  down: async (client) => {
    await client.query('DELETE FROM feature_flag WHERE key = $1', ['english_app_global_enabled']);
  },
};
