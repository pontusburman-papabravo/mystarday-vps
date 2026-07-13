'use strict';

module.exports = {
  name: '1809380000000_handoff_film_completed_at',

  up: async (client) => {
    await client.query(`
      ALTER TABLE family_activation_state
      ADD COLUMN IF NOT EXISTS handoff_film_completed_at TIMESTAMPTZ
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE family_activation_state
      DROP COLUMN IF EXISTS handoff_film_completed_at
    `);
  },
};
