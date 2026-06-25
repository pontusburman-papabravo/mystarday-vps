'use strict';

/**
 * ACT-1 D2 — 24h påminnelse efter child_handoff_skipped.
 */

module.exports = {
  name: '1808710000000_child_handoff_reminder',

  up: async (client) => {
    await client.query(`
      ALTER TABLE family_activation_state
        ADD COLUMN IF NOT EXISTS child_handoff_reminder_sent_at TIMESTAMPTZ
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE family_activation_state
        DROP COLUMN IF EXISTS child_handoff_reminder_sent_at
    `);
  },
};
