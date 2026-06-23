'use strict';

/**
 * dagens_nyhet banner dismiss tracking (JSONB array of parent UUID strings).
 * Code in src/routes/dagens-nyhet.js expects this column; prod was missing it.
 */

module.exports = {
  name: '1808200000000_dagens_nyhet_dismissed_by_parent_ids',

  up: async (client) => {
    await client.query(`
      ALTER TABLE dagens_nyhet
      ADD COLUMN IF NOT EXISTS dismissed_by_parent_ids JSONB NOT NULL DEFAULT '[]'::jsonb
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE dagens_nyhet
      DROP COLUMN IF EXISTS dismissed_by_parent_ids
    `);
  },
};
