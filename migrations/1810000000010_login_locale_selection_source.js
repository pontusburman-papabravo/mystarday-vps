'use strict';

/**
 * Allow locale_selection_source = 'login' for pre-auth switcher choice at sign-in.
 */

const SELECTION_SOURCES = [
  'registration',
  'login',
  'settings',
  'existing_user_offer',
  'admin',
  'legacy_default',
];

module.exports = {
  name: '1810000000010_login_locale_selection_source',

  up: async (client) => {
    const sourceList = SELECTION_SOURCES.map((s) => `'${s}'`).join(', ');
    await client.query(`
      ALTER TABLE family DROP CONSTRAINT IF EXISTS family_locale_selection_source_check
    `);
    await client.query(`
      ALTER TABLE family
        ADD CONSTRAINT family_locale_selection_source_check
        CHECK (locale_selection_source IS NULL OR locale_selection_source IN (${sourceList}))
    `);
  },

  down: async (client) => {
    await client.query(`
      UPDATE family
      SET locale_selection_source = 'settings'
      WHERE locale_selection_source = 'login'
    `);
    const sourceList = SELECTION_SOURCES.filter((s) => s !== 'login').map((s) => `'${s}'`).join(', ');
    await client.query(`
      ALTER TABLE family DROP CONSTRAINT IF EXISTS family_locale_selection_source_check
    `);
    await client.query(`
      ALTER TABLE family
        ADD CONSTRAINT family_locale_selection_source_check
        CHECK (locale_selection_source IS NULL OR locale_selection_source IN (${sourceList}))
    `);
  },
};
