'use strict';

/**
 * Parent background theme preference for the magic view: 'dark' | 'light'.
 *
 * The classic view has been removed — the magic design is now the only parent
 * view, and parents can instead choose a dark or light background. Stored on
 * the account so the choice follows them across devices. Default 'dark'
 * (current behavior).
 */

module.exports = {
  name: '1808680000000_parent_theme_preference',

  up: async (client) => {
    await client.query(`
      ALTER TABLE parent
      ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(10) NOT NULL DEFAULT 'dark'
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE parent
      DROP COLUMN IF EXISTS theme_preference
    `);
  },
};
