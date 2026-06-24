'use strict';

/**
 * Seed the win_back_auto_approve feature flag (default ON).
 *
 * When enabled, the win-back scheduler sends emails automatically instead of
 * queuing them for manual admin approval. Admins can toggle it off in the
 * Email-logg panel to restore the manual approval workflow.
 */

module.exports = {
  name: '1808500000000_win_back_auto_approve_flag',

  up: async (client) => {
    await client.query(`
      INSERT INTO feature_flag (key, enabled, description)
      VALUES ('win_back_auto_approve', true, 'Skicka win-back-mejl automatiskt utan manuellt godkännande')
      ON CONFLICT (key) DO NOTHING
    `);
  },

  down: async (client) => {
    await client.query(`DELETE FROM feature_flag WHERE key = 'win_back_auto_approve'`);
  },
};
