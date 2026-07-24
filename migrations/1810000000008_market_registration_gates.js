'use strict';

/**
 * Market registration gates (feature_flag).
 * Sweden is the first open market; EU/UK/US/OTHER require explicit product enablement.
 */

const MIGRATION_NAME = '1810000000008_market_registration_gates';

module.exports = {
  name: MIGRATION_NAME,

  up: async (client) => {
    await client.query(`
      INSERT INTO feature_flag (key, enabled, description)
      VALUES
        ('market_se_open', true, 'Allow new family registration from Sweden'),
        ('market_eu_open', false, 'Allow new family registration from EU/EEA countries other than Sweden'),
        ('market_uk_open', false, 'Allow new family registration from United Kingdom'),
        ('market_us_open', false, 'Allow new family registration from United States'),
        ('market_other_open', false, 'Allow new family registration from other countries')
      ON CONFLICT (key) DO NOTHING
    `);
  },

  down: async (client) => {
    await client.query(`
      DELETE FROM feature_flag
      WHERE key IN (
        'market_se_open', 'market_eu_open', 'market_uk_open', 'market_us_open', 'market_other_open'
      )
    `);
  },
};
