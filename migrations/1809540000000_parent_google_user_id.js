'use strict';

module.exports = {
  name: '1809540000000_parent_google_user_id',

  up: async (client) => {
    await client.query(`
      ALTER TABLE parent
      ADD COLUMN IF NOT EXISTS google_user_id VARCHAR(255)
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS parent_google_user_id_idx
      ON parent (google_user_id)
      WHERE google_user_id IS NOT NULL
    `);
  },

  down: async (client) => {
    await client.query('DROP INDEX IF EXISTS parent_google_user_id_idx');
    await client.query('ALTER TABLE parent DROP COLUMN IF EXISTS google_user_id');
  },
};
