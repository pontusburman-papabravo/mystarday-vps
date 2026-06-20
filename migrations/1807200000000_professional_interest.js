/**
 * professional_interest — public educator/therapist interest form (/pedagoger-och-terapeuter).
 * Table was referenced in routes but never migrated.
 */
module.exports = {
  name: '1807200000000_professional_interest',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS professional_interest (
        id            SERIAL PRIMARY KEY,
        name          VARCHAR(255) NOT NULL,
        email         VARCHAR(255) NOT NULL,
        role          VARCHAR(100) NOT NULL,
        organization  VARCHAR(255),
        message       TEXT,
        gdpr_consent  BOOLEAN NOT NULL DEFAULT false,
        ip_address    VARCHAR(64),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_professional_interest_created
      ON professional_interest (created_at DESC)
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS professional_interest');
  },
};
