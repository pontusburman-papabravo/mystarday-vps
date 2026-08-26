'use strict';

/**
 * Finland staged registration gate (P-FI-LAUNCH).
 * Independent of market_eu_open — default OFF until launch control.
 */

module.exports = {
  name: '1810330000000_market_fi_open',

  up: async (client) => {
    await client.query(`
      INSERT INTO feature_flag (key, enabled, description)
      VALUES
        ('market_fi_open', false, 'Allow new family registration from Finland')
      ON CONFLICT (key) DO NOTHING
    `);
  },

  down: async (client) => {
    await client.query(`
      DELETE FROM feature_flag
      WHERE key = 'market_fi_open'
    `);
  },
};
