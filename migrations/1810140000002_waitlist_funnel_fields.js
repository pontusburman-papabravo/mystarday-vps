'use strict';

/**
 * English waitlist → launch funnel fields (locale, consent, conversion link).
 * No automatic launch emails in this migration — columns only.
 */

module.exports = {
  name: '1810140000002_waitlist_funnel_fields',

  up: async (client) => {
    await client.query(`
      ALTER TABLE waitlist
        ADD COLUMN IF NOT EXISTS landing_locale VARCHAR(16) DEFAULT 'en-GB',
        ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS marketing_consent_version VARCHAR(32),
        ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(64),
        ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(128),
        ADD COLUMN IF NOT EXISTS utm_content VARCHAR(128),
        ADD COLUMN IF NOT EXISTS platform VARCHAR(32),
        ADD COLUMN IF NOT EXISTS launch_invited_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS converted_family_id UUID REFERENCES family(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ
    `);
    // Grandfather existing waitlist rows that signed up for launch updates before
    // the explicit checkbox existed (they opted in by joining the waitlist).
    await client.query(`
      UPDATE waitlist
      SET marketing_consent = true,
          marketing_consent_at = COALESCE(marketing_consent_at, created_at),
          marketing_consent_version = COALESCE(marketing_consent_version, 'waitlist_legacy_v0')
      WHERE marketing_consent = false
        AND marketing_consent_at IS NULL
        AND created_at < NOW()
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_waitlist_converted_family
        ON waitlist (converted_family_id)
        WHERE converted_family_id IS NOT NULL
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_waitlist_launch_invited
        ON waitlist (launch_invited_at)
        WHERE launch_invited_at IS NOT NULL
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE waitlist
        DROP COLUMN IF EXISTS landing_locale,
        DROP COLUMN IF EXISTS marketing_consent,
        DROP COLUMN IF EXISTS marketing_consent_at,
        DROP COLUMN IF EXISTS marketing_consent_version,
        DROP COLUMN IF EXISTS utm_medium,
        DROP COLUMN IF EXISTS utm_campaign,
        DROP COLUMN IF EXISTS utm_content,
        DROP COLUMN IF EXISTS platform,
        DROP COLUMN IF EXISTS launch_invited_at,
        DROP COLUMN IF EXISTS converted_family_id,
        DROP COLUMN IF EXISTS converted_at
    `);
  },
};
