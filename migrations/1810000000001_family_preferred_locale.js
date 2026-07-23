'use strict';

/**
 * Family-level locale preference (canonical i18n source after registration).
 * Existing families backfilled to sv-SE.
 */

module.exports = {
  name: '1810000000001_family_preferred_locale',

  up: async (client) => {
    await client.query(`
      ALTER TABLE family
      ADD COLUMN IF NOT EXISTS preferred_locale VARCHAR(16) NOT NULL DEFAULT 'sv-SE'
    `);

    await client.query(`
      UPDATE family
      SET preferred_locale = 'sv-SE'
      WHERE preferred_locale IS NULL OR preferred_locale = '' OR preferred_locale = 'sv'
    `);

    await client.query(`
      ALTER TABLE family
      DROP CONSTRAINT IF EXISTS family_preferred_locale_check
    `);

    await client.query(`
      ALTER TABLE family
      ADD CONSTRAINT family_preferred_locale_check
      CHECK (preferred_locale IN ('sv-SE', 'en-GB'))
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE family
      DROP CONSTRAINT IF EXISTS family_preferred_locale_check
    `);
    await client.query(`
      ALTER TABLE family
      DROP COLUMN IF EXISTS preferred_locale
    `);
  },
};
