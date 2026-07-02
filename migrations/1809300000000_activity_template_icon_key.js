'use strict';

/**
 * Nullable pictogram key on activity_template (bildstöd panel 1).
 */
module.exports = {
  name: '1809300000000_activity_template_icon_key',

  up: async (client) => {
    await client.query(`
      ALTER TABLE activity_template
        ADD COLUMN IF NOT EXISTS icon_key VARCHAR(64)
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE activity_template DROP COLUMN IF EXISTS icon_key
    `);
  },
};
