'use strict';

/**
 * Durable first-touch acquisition attribution per family.
 * Normalized fields only — no raw URLs, no click tokens/secrets.
 */

module.exports = {
  name: '1810140000000_family_acquisition_attribution',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS family_acquisition_attribution (
        family_id UUID PRIMARY KEY REFERENCES family(id) ON DELETE CASCADE,
        source VARCHAR(64),
        medium VARCHAR(64),
        campaign VARCHAR(128),
        content VARCHAR(128),
        term VARCHAR(128),
        referral_code VARCHAR(12),
        landing_locale VARCHAR(16),
        platform VARCHAR(32),
        first_touch_at TIMESTAMPTZ,
        registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_family_acq_source
        ON family_acquisition_attribution (source)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_family_acq_referral
        ON family_acquisition_attribution (referral_code)
        WHERE referral_code IS NOT NULL
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_family_acq_registered
        ON family_acquisition_attribution (registered_at DESC)
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS family_acquisition_attribution');
  },
};
