'use strict';

/**
 * Schema drift fix — login_event is required by activation retention (Fas 6A)
 * and admin login stats, but was only in baseline-schema.sql (not migrations/).
 */
module.exports = {
  name: '1806300000000_ensure_login_event',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS login_event (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        role VARCHAR(32) NOT NULL,
        family_id UUID REFERENCES family(id) ON DELETE SET NULL,
        occurred_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS login_event_family_occurred_idx
        ON login_event (family_id, occurred_at DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS login_event_user_occurred_idx
        ON login_event (user_id, occurred_at DESC)
    `);
  },
};
