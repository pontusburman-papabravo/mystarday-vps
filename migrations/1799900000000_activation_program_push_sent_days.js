'use strict';

/**
 * Fas 5 — track activation program push per effective day (max 1 push per day 2–7).
 */

module.exports = {
  name: '1799900000000_activation_program_push_sent_days',

  up: async (client) => {
    await client.query(`
      ALTER TABLE parent_activation_program
        ADD COLUMN IF NOT EXISTS push_sent_days JSONB NOT NULL DEFAULT '{}'
    `);
  },
};
