'use strict';

/**
 * English i18n (parent + child) — go live for all families.
 * Prod already has english_app_global_enabled ON (skolstart audit 2026-08-17).
 */

module.exports = {
  name: '1810310000000_english_app_live',

  up: async (client) => {
    await client.query(`
      UPDATE features SET status = 'live', updated_at = NOW()
      WHERE slug IN ('english_app', 'english_child_experience')
    `);
  },

  down: async (client) => {
    await client.query(`
      UPDATE features SET status = 'dev', updated_at = NOW()
      WHERE slug IN ('english_app', 'english_child_experience')
    `);
  },
};
