'use strict';

/**
 * Canada registration gate. Default ON — new Canadian families may register.
 * Does not change Sweden, Ireland, or any existing family row.
 * Complimentary access still comes from market_ie_free_until (shared cutoff).
 */

module.exports = {
  name: '1810550000000_market_ca_open',
  snapshotContract: {
    backwardCompatible: true,
    allowedBusinessTableFingerprintChanges: [],
    featureFlagInserts: [{ key: 'market_ca_open', enabled: true }],
  },

  up: async (client) => {
    await client.query(`
      INSERT INTO feature_flag (key, enabled, description)
      VALUES (
        'market_ca_open',
        true,
        'Allow new family registration from Canada'
      )
      ON CONFLICT (key) DO NOTHING
    `);
  },

  down: async (client) => {
    await client.query(`
      DELETE FROM feature_flag
      WHERE key = 'market_ca_open'
    `);
  },
};
