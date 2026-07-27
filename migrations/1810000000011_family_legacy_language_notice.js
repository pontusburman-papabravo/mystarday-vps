'use strict';

/**
 * Legacy-language notice dismissal for families that switched sv → en-GB.
 * The notice itself is derived (preferred_locale + previous_locale); only the
 * per-family dismissal timestamp is stored.
 */

module.exports = {
  name: '1810000000011_family_legacy_language_notice',

  up: async (client) => {
    await client.query(`
      ALTER TABLE family
        ADD COLUMN IF NOT EXISTS legacy_language_notice_dismissed_at TIMESTAMPTZ
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE family
        DROP COLUMN IF EXISTS legacy_language_notice_dismissed_at
    `);
  },
};
