'use strict';

/**
 * Per-family allow/deny overrides for allowlisted activation feature_flag keys.
 * Default: no rows — all families follow global feature_flag + cohort rules.
 */

module.exports = {
  name: '1810160000000_family_feature_override',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS family_feature_override (
        family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        feature_key VARCHAR(128) NOT NULL,
        enabled BOOLEAN NOT NULL,
        reason VARCHAR(255),
        source VARCHAR(64) NOT NULL DEFAULT 'cli',
        created_by VARCHAR(128),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        PRIMARY KEY (family_id, feature_key)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_family_feature_override_feature_key
        ON family_feature_override (feature_key)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_family_feature_override_expires
        ON family_feature_override (expires_at)
        WHERE expires_at IS NOT NULL
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS family_feature_override');
  },
};
