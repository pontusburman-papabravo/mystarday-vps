'use strict';

/**
 * R4.2 — server-side trusted device registry (child device vertical slice).
 */

module.exports = {
  name: '1810180000000_trusted_device_v1',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS family_trusted_device (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        created_by_parent_id UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
        device_mode VARCHAR(16) NOT NULL CHECK (device_mode IN ('parent', 'child', 'shared')),
        default_child_id UUID REFERENCES child(id) ON DELETE CASCADE,
        last_active_child_id UUID REFERENCES child(id) ON DELETE SET NULL,
        token_hash VARCHAR(64) NOT NULL,
        platform VARCHAR(32),
        label VARCHAR(120),
        trusted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ,
        last_refresh_token_id UUID REFERENCES refresh_token(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS family_trusted_device_token_hash_idx
        ON family_trusted_device (token_hash)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS family_trusted_device_family_active_idx
        ON family_trusted_device (family_id)
        WHERE revoked_at IS NULL
    `);
    await client.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, false, $2)
       ON CONFLICT (key) DO NOTHING`,
      ['trusted_device_v1', 'R4.2 trusted device + silent child session restore']
    );
  },

  down: async (client) => {
    await client.query('DELETE FROM feature_flag WHERE key = $1', ['trusted_device_v1']);
    await client.query('DROP TABLE IF EXISTS family_trusted_device');
  },
};
