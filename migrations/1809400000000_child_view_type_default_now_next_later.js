'use strict';

/**
 * Default view_type for newly created children → now_next_later (bildstöd PR 2).
 * Does not backfill existing rows.
 */
module.exports = {
  name: '1809400000000_child_view_type_default_now_next_later',

  up: async (client) => {
    await client.query(`
      ALTER TABLE child
        ALTER COLUMN view_type SET DEFAULT 'now_next_later'
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE child
        ALTER COLUMN view_type DROP DEFAULT
    `);
  },
};
