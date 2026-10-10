'use strict';

/**
 * One registration flag per remaining EU/EEA country in the picker.
 * All default OFF. Does not change market_se_open, market_ie_open,
 * market_ca_open, market_fi_open, market_no_open, market_dk_open,
 * or market_eu_open. The bulk flag stays in the database and is no
 * longer a registration opener.
 */

const {
  INDIVIDUAL_GATE_COUNTRY_CODES,
  GATE_KEYS,
} = require('../src/lib/market-region');

const FLAG_INSERTS = INDIVIDUAL_GATE_COUNTRY_CODES.map((code) => ({
  key: GATE_KEYS[code],
  enabled: false,
  description: `Allow new family registration from ${code}`,
}));

module.exports = {
  name: '1810570000000_market_individual_country_gates',
  snapshotContract: {
    backwardCompatible: true,
    allowedBusinessTableFingerprintChanges: [],
    featureFlagInserts: FLAG_INSERTS.map((row) => ({ key: row.key, enabled: false })),
  },

  up: async (client) => {
    for (const row of FLAG_INSERTS) {
      await client.query(
        `INSERT INTO feature_flag (key, enabled, description)
         VALUES ($1, false, $2)
         ON CONFLICT (key) DO NOTHING`,
        [row.key, row.description]
      );
    }
  },

  down: async (client) => {
    await client.query(
      `DELETE FROM feature_flag WHERE key = ANY($1::text[])`,
      [FLAG_INSERTS.map((row) => row.key)]
    );
  },
};
