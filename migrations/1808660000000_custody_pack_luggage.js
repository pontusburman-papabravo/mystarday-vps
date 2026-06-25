'use strict';

/**
 * Migration 180866 — optional pack-luggage reminder on custody handoff eve.
 */

module.exports = {
  name: '1808660000000_custody_pack_luggage',

  up: async (client) => {
    await client.query(`
      ALTER TABLE custody_pattern
        ADD COLUMN IF NOT EXISTS pack_luggage_reminder BOOLEAN NOT NULL DEFAULT true
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE custody_pattern
        DROP COLUMN IF EXISTS pack_luggage_reminder
    `);
  },
};
