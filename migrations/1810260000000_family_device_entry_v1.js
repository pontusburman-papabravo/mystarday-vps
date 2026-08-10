'use strict';

/**
 * Fas 2B — entry orchestrator rollout (independent of trusted_device_v1 kill switch).
 */

module.exports = {
  name: '1810260000000_family_device_entry_v1',

  snapshotContract: {
    backwardCompatible: true,
    schemaOnly: true,
    featureFlagInserts: [{ key: 'family_device_entry_v1', enabled: false }],
  },

  up: async (client) => {
    await client.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, false, $2)
       ON CONFLICT (key) DO NOTHING`,
      ['family_device_entry_v1', 'Fas 2B — server app-entry orchestrator (cold start authority)']
    );
  },

  down: async (client) => {
    await client.query('DELETE FROM feature_flag WHERE key = $1', ['family_device_entry_v1']);
  },
};
