'use strict';

/**
 * Locale is an app catalog, not a closed SQL enum.
 * sv-SE and en-GB still match. A future BCP 47 tag (xx-XX) does not need
 * another migration. Application Zod + locale.js still reject unknown tags.
 * Does not change country, market, or commercial policy.
 */

module.exports = {
  name: '1810540000000_family_locale_bcp47_check',

  up: async (client) => {
    await client.query('ALTER TABLE family DROP CONSTRAINT IF EXISTS family_preferred_locale_check');
    await client.query(`
      ALTER TABLE family
        ADD CONSTRAINT family_preferred_locale_check
        CHECK (preferred_locale ~ '^[a-z]{2}-[A-Z]{2}$')
    `);
  },

  down: async (client) => {
    await client.query('ALTER TABLE family DROP CONSTRAINT IF EXISTS family_preferred_locale_check');
    await client.query(`
      ALTER TABLE family
        ADD CONSTRAINT family_preferred_locale_check
        CHECK (preferred_locale IN ('sv-SE', 'en-GB'))
    `);
  },
};
