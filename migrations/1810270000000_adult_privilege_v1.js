'use strict';

/**
 * Fas 3A — Barn → Vuxen privilege escalation (biometric + server credential).
 */

module.exports = {
  name: '1810270000000_adult_privilege_v1',

  snapshotContract: {
    backwardCompatible: true,
    schemaOnly: true,
    featureFlagInserts: [{ key: 'adult_privilege_v1', enabled: false }],
  },

  up: async (client) => {
    await client.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, false, $2)
       ON CONFLICT (key) DO NOTHING`,
      ['adult_privilege_v1', 'Fas 3A — adult privilege escalation from child/shared context']
    );
  },

  down: async (client) => {
    await client.query('DELETE FROM feature_flag WHERE key = $1', ['adult_privilege_v1']);
  },
};
