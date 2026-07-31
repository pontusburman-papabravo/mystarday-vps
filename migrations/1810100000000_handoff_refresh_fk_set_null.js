/**
 * Keep parent_session_handoff rows after consume so replay returns PARENT_HANDOFF_USED.
 * Deleting the linked refresh_token must not CASCADE-delete the handoff row.
 */
module.exports = {
  name: '1810100000000_handoff_refresh_fk_set_null',

  up: async (client) => {
    await client.query(`
      ALTER TABLE parent_session_handoff
      DROP CONSTRAINT IF EXISTS parent_session_handoff_refresh_token_id_fkey
    `);
    await client.query(`
      ALTER TABLE parent_session_handoff
      ALTER COLUMN refresh_token_id DROP NOT NULL
    `);
    await client.query(`
      ALTER TABLE parent_session_handoff
      ADD CONSTRAINT parent_session_handoff_refresh_token_id_fkey
      FOREIGN KEY (refresh_token_id) REFERENCES refresh_token(id) ON DELETE SET NULL
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE parent_session_handoff
      DROP CONSTRAINT IF EXISTS parent_session_handoff_refresh_token_id_fkey
    `);
    await client.query(`
      DELETE FROM parent_session_handoff WHERE refresh_token_id IS NULL
    `);
    await client.query(`
      ALTER TABLE parent_session_handoff
      ALTER COLUMN refresh_token_id SET NOT NULL
    `);
    await client.query(`
      ALTER TABLE parent_session_handoff
      ADD CONSTRAINT parent_session_handoff_refresh_token_id_fkey
      FOREIGN KEY (refresh_token_id) REFERENCES refresh_token(id) ON DELETE CASCADE
    `);
  },
};
