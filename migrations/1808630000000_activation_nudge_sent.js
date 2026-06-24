'use strict';

module.exports = {
  name: '1808630000000_activation_nudge_sent',

  up: async (client) => {
    await client.query(`
      ALTER TABLE family_activation_state
        ADD COLUMN IF NOT EXISTS activation_nudge_sent_at TIMESTAMPTZ
    `);
    await client.query(`
      INSERT INTO feature_flag (key, enabled, description)
      VALUES ('activation_nudge_v1', false, 'ACT-1 email nudge 24–48h om ej P0 aktiverad')
      ON CONFLICT (key) DO NOTHING
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE family_activation_state
        DROP COLUMN IF EXISTS activation_nudge_sent_at
    `);
    await client.query(`DELETE FROM feature_flag WHERE key = 'activation_nudge_v1'`);
  },
};
