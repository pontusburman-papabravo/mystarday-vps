'use strict';

/**
 * Fas 4A — trusted device daily child UX (no PIN/login path on enrolled devices).
 */

module.exports = {
  name: '1810280000000_family_device_daily_ux_v1',

  snapshotContract: {
    backwardCompatible: true,
    schemaOnly: true,
    featureFlagInserts: [{ key: 'family_device_daily_ux_v1', enabled: false }],
  },

  up: async (client) => {
    await client.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, false, $2)
       ON CONFLICT (key) DO NOTHING`,
      ['family_device_daily_ux_v1', 'Fas 4A — trusted device daily child UX (profile picker, no child logout)']
    );
  },

  down: async (client) => {
    await client.query('DELETE FROM feature_flag WHERE key = $1', ['family_device_daily_ux_v1']);
  },
};
