'use strict';

/**
 * R4 final — stable trusted-device lineage on refresh_token rows (immutable across rotation).
 */

module.exports = {
  name: '1810220000000_refresh_token_trusted_device_lineage',

  snapshotContract: {
    backwardCompatible: true,
    schemaOnly: true,
  },

  up: async (client) => {
    await client.query(`
      ALTER TABLE refresh_token
        ADD COLUMN IF NOT EXISTS trusted_device_id UUID
          REFERENCES family_trusted_device(id) ON DELETE SET NULL
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS refresh_token_trusted_device_id_idx
        ON refresh_token (trusted_device_id)
        WHERE trusted_device_id IS NOT NULL
    `);
    await client.query(`
      UPDATE refresh_token rt
      SET trusted_device_id = d.id
      FROM family_trusted_device d
      WHERE d.last_refresh_token_id = rt.id
        AND rt.trusted_device_id IS NULL
        AND d.revoked_at IS NULL
    `);
  },

  down: async (client) => {
    await client.query('DROP INDEX IF EXISTS refresh_token_trusted_device_id_idx');
    await client.query('ALTER TABLE refresh_token DROP COLUMN IF EXISTS trusted_device_id');
  },
};
