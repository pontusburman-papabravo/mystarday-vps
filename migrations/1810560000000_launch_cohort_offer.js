'use strict';

/**
 * First-25 launch cohort ledger. Default off.
 * Does not open a market and does not change Sweden, Ireland, or Canada.
 * assigned_count never decreases, so a place is not reused.
 */

const {
  LAUNCH_COHORT_FLAG_KEY,
  LAUNCH_COHORT_ELIGIBLE_COUNTRY_CODES,
  LAUNCH_COHORT_SLOT_LIMIT,
} = require('../src/lib/launch-cohort-offer');

module.exports = {
  name: '1810560000000_launch_cohort_offer',
  snapshotContract: {
    backwardCompatible: true,
    schemaOnly: true,
    featureFlagInserts: [{ key: LAUNCH_COHORT_FLAG_KEY, enabled: false }],
  },

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS market_launch_cohort_config (
        country_code CHAR(2) PRIMARY KEY,
        enabled BOOLEAN NOT NULL DEFAULT false,
        slot_limit INTEGER NOT NULL DEFAULT 25,
        assigned_count INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT market_launch_cohort_config_slot_limit_check
          CHECK (slot_limit = 25),
        CONSTRAINT market_launch_cohort_config_assigned_check
          CHECK (assigned_count >= 0 AND assigned_count <= slot_limit),
        CONSTRAINT market_launch_cohort_config_country_check
          CHECK (country_code NOT IN ('SE', 'IE', 'CA'))
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS family_launch_cohort_grant (
        family_id UUID PRIMARY KEY REFERENCES family(id) ON DELETE CASCADE,
        country_code CHAR(2) NOT NULL,
        slot_number INTEGER NOT NULL,
        time_zone TEXT NOT NULL,
        granted_at TIMESTAMPTZ NOT NULL,
        starts_at TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT family_launch_cohort_grant_slot_check
          CHECK (slot_number >= 1 AND slot_number <= 25),
        CONSTRAINT family_launch_cohort_grant_country_check
          CHECK (country_code NOT IN ('SE', 'IE', 'CA')),
        CONSTRAINT family_launch_cohort_grant_period_check
          CHECK (expires_at > starts_at),
        CONSTRAINT family_launch_cohort_grant_slot_unique
          UNIQUE (country_code, slot_number)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_family_launch_cohort_grant_expires
        ON family_launch_cohort_grant (expires_at)
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_family_entitlements_launch_cohort_unique
        ON family_entitlements (family_id, entitlement_key)
        WHERE source = 'launch_cohort' AND revoked_at IS NULL
    `);

    await client.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, false, $2)
       ON CONFLICT (key) DO NOTHING`,
      [
        LAUNCH_COHORT_FLAG_KEY,
        'First 25 families per enabled new market get 12 months of Premium with no payment method and no automatic charge. Default off. Does not include Sweden, Ireland, or Canada.',
      ]
    );

    for (const countryCode of LAUNCH_COHORT_ELIGIBLE_COUNTRY_CODES) {
      await client.query(
        `INSERT INTO market_launch_cohort_config (country_code, enabled, slot_limit, assigned_count)
         VALUES ($1, false, $2, 0)
         ON CONFLICT (country_code) DO NOTHING`,
        [countryCode, LAUNCH_COHORT_SLOT_LIMIT]
      );
    }
  },

  down: async (client) => {
    await client.query(`
      DELETE FROM family_entitlements
      WHERE source = 'launch_cohort'
    `);
    await client.query('DROP INDEX IF EXISTS idx_family_entitlements_launch_cohort_unique');
    await client.query('DROP TABLE IF EXISTS family_launch_cohort_grant');
    await client.query('DROP TABLE IF EXISTS market_launch_cohort_config');
    await client.query('DELETE FROM feature_flag WHERE key = $1', [LAUNCH_COHORT_FLAG_KEY]);
  },
};
