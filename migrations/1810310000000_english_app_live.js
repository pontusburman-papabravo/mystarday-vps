'use strict';

/**
 * English parent/auth (english_app) — go live for all families.
 * Prod already has english_app_global_enabled ON (skolstart audit 2026-08-17).
 * english_child_experience stays dev until Child Core device QA (ADR-021, i18n plan).
 */

module.exports = {
  name: '1810310000000_english_app_live',

  up: async (client) => {
    await client.query(`
      UPDATE features SET status = 'live', updated_at = NOW()
      WHERE slug = 'english_app'
    `);
  },

  down: async (client) => {
    await client.query(`
      UPDATE features SET status = 'dev', updated_at = NOW()
      WHERE slug = 'english_app'
    `);
  },
};
