/**
 * Opaque parent session handoff for child-login → parent restore path.
 */
module.exports = {
  name: '1810000000018_parent_session_handoff',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS parent_session_handoff (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        parent_id UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
        family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        refresh_token_id UUID NOT NULL REFERENCES refresh_token(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ,
        created_ip VARCHAR(64),
        user_agent TEXT
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS parent_session_handoff_parent_created_idx
        ON parent_session_handoff (parent_id, created_at DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS parent_session_handoff_family_created_idx
        ON parent_session_handoff (family_id, created_at DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS parent_session_handoff_expires_idx
        ON parent_session_handoff (expires_at)
    `);
  },

  down: async (client) => {
    await client.query('DROP INDEX IF EXISTS parent_session_handoff_expires_idx');
    await client.query('DROP INDEX IF EXISTS parent_session_handoff_family_created_idx');
    await client.query('DROP INDEX IF EXISTS parent_session_handoff_parent_created_idx');
    await client.query('DROP TABLE IF EXISTS parent_session_handoff');
  },
};
