'use strict';

/**
 * Staged per-country registration gates (P-EEA-LAUNCH-FRAMEWORK).
 * IE first; NO/DK reserved for later waves. All default OFF.
 */

module.exports = {
  name: '1810320000000_market_country_gates',

  up: async (client) => {
    await client.query(`
      INSERT INTO feature_flag (key, enabled, description)
      VALUES
        ('market_ie_open', false, 'Allow new family registration from Ireland'),
        ('market_no_open', false, 'Allow new family registration from Norway'),
        ('market_dk_open', false, 'Allow new family registration from Denmark')
      ON CONFLICT (key) DO NOTHING
    `);
  },

  down: async (client) => {
    await client.query(`
      DELETE FROM feature_flag
      WHERE key IN ('market_ie_open', 'market_no_open', 'market_dk_open')
    `);
  },
};
