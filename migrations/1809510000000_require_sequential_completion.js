'use strict';

/**
 * Parent opt-in: NU/NÄSTA/SEDAN sequential mode (default off — free checkoff).
 */
module.exports = {
  name: '1809510000000_require_sequential_completion',

  up: async (client) => {
    await client.query(`
      ALTER TABLE child
        ADD COLUMN IF NOT EXISTS require_sequential_completion BOOLEAN NOT NULL DEFAULT false
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE child
        DROP COLUMN IF EXISTS require_sequential_completion
    `);
  },
};
