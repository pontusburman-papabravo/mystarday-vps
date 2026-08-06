'use strict';

module.exports = {
  name: '1810210000000_growth_home_v1',

  snapshotContract: {
    backwardCompatible: true,
    schemaOnly: true,
    featureFlagInserts: [{ key: 'growth_home_v1', enabled: true }],
  },

  up: async (client) => {
    await client.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, true, $2)
       ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled`,
      ['growth_home_v1', 'R4.7 Journey-led growth on Hem (invite, weekly highlight, referral)']
    );
  },

  down: async (client) => {
    await client.query('DELETE FROM feature_flag WHERE key = $1', ['growth_home_v1']);
  },
};
