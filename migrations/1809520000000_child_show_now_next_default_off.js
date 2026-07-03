'use strict';

/**
 * New children: free checkoff by default; parents opt in to NU/NÄSTA/SEDAN.
 * Does not backfill existing rows.
 */
module.exports = {
  name: '1809520000000_child_show_now_next_default_off',

  up: async (client) => {
    await client.query(`
      ALTER TABLE child
        ALTER COLUMN show_now_next SET DEFAULT false
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE child
        ALTER COLUMN show_now_next SET DEFAULT true
    `);
  },
};
