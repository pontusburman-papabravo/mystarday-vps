/**
 * Fas 4 — enroll_source + email invite tracking.
 */
module.exports = {
  name: '1799700000000_activation_program_enroll_source',

  up: async (client) => {
    await client.query(`
      ALTER TABLE parent_activation_program
        ADD COLUMN IF NOT EXISTS enroll_source TEXT
          CHECK (enroll_source IS NULL OR enroll_source IN (
            'onboarding_complete', 'email_reactivation'
          ))
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS activation_program_email_invite (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        parent_id  UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
        family_id  UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        token      UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        sent_at    TIMESTAMPTZ,
        clicked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS activation_program_email_invite_family
        ON activation_program_email_invite (family_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS activation_program_email_invite_parent_sent
        ON activation_program_email_invite (parent_id, sent_at DESC)
    `);
  },

  down: async (client) => {
    await client.query(`DROP TABLE IF EXISTS activation_program_email_invite`);
    await client.query(`
      ALTER TABLE parent_activation_program
        DROP COLUMN IF EXISTS enroll_source
    `);
  },
};
