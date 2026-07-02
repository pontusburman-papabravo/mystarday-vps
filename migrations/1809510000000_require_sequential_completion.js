'use strict';

/**
 * Parent toggle: require child to complete NU activity before NÄSTA/SEDAN (default on).
 */
module.exports = {
  name: '1809510000000_require_sequential_completion',

  up: async (client) => {
    await client.query(`
      ALTER TABLE child
        ADD COLUMN IF NOT EXISTS require_sequential_completion BOOLEAN NOT NULL DEFAULT true
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE child
        DROP COLUMN IF EXISTS require_sequential_completion
    `);
  },
};
