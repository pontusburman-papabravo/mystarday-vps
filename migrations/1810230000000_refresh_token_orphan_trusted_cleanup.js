'use strict';

/**
 * Fail-safe: drop child refresh rows still tied to revoked or missing trusted devices.
 */

module.exports = {
  name: '1810230000000_refresh_token_orphan_trusted_cleanup',

  snapshotContract: {
    backwardCompatible: true,
    schemaOnly: false,
  },

  up: async (client) => {
    await client.query(`
      DELETE FROM refresh_token rt
      WHERE rt.user_type = 'child'
        AND rt.trusted_device_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM family_trusted_device d
          WHERE d.id = rt.trusted_device_id AND d.revoked_at IS NULL
        )
    `);
  },

  down: async () => {
    /* irreversible session cleanup */
  },
};
