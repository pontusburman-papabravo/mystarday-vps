/**
 * package_interest waitlist table (§9.8).
 */
module.exports = {
  name: '1806900000000_package_interest',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS package_interest (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_id   UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        parent_id   UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
        component   TEXT NOT NULL CHECK (component IN ('reporting', 'pedagog', 'teacch')),
        source      TEXT NOT NULL,
        comment     TEXT CHECK (char_length(comment) <= 280),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (family_id, component)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_package_interest_component
      ON package_interest (component)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_package_interest_created
      ON package_interest (created_at DESC)
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS package_interest');
  },
};
