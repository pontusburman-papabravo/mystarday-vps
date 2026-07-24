'use strict';

/**
 * Rollout kill switch for existing-family English beta offer (P-i18n-Language-Launch-Foundation).
 * New-user registration language choice is unaffected.
 */

module.exports = {
  name: '1810000000006_english_language_offer_flag',

  up: async (client) => {
    await client.query(`
      INSERT INTO feature_flag (key, enabled, description)
      VALUES (
        'english_language_offer',
        true,
        'One-time English beta offer for existing sv-SE families'
      )
      ON CONFLICT (key) DO NOTHING
    `);
  },

  down: async (client) => {
    await client.query(`
      DELETE FROM feature_flag WHERE key = 'english_language_offer'
    `);
  },
};
