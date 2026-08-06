'use strict';

module.exports = {
  name: '1810200000000_journey_retention_home_v1',

  snapshotContract: {
    backwardCompatible: true,
    schemaOnly: true,
    featureFlagInserts: [{ key: 'journey_retention_home_v1', enabled: true }],
  },

  up: async (client) => {
    await client.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, true, $2)
       ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled`,
      ['journey_retention_home_v1', 'R4.6 canonical Hem retention — one primary Journey step']
    );
  },

  down: async (client) => {
    await client.query('DELETE FROM feature_flag WHERE key = $1', ['journey_retention_home_v1']);
  },
};
