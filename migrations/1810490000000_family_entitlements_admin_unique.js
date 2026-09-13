'use strict';

/**
 * One unrevoked admin Premium grant per family+key.
 *
 * Duplicate unrevoked admin rows are collapsed before the unique index.
 * Keeper is the row the resolver would already treat as effective:
 *   1. semantically live (expires_at IS NULL OR expires_at > NOW())
 *   2. among live rows, oldest granted_at (resolver scans granted_at ASC)
 *   3. if none are live, newest expired row (history only)
 *
 * History stays. Does not touch grandfather, intro_year, apple, google, or gift.
 */

async function dedupeActiveAdminEntitlements(client) {
  await client.query(`
    UPDATE family_entitlements fe
    SET
      revoked_at = NOW(),
      updated_at = NOW(),
      metadata = COALESCE(fe.metadata, '{}'::jsonb) || jsonb_build_object(
        'revoked_for', 'admin_unique_index_backfill',
        'kept_id', keeper.id
      )
    FROM (
      SELECT DISTINCT ON (family_id, entitlement_key) id, family_id, entitlement_key
      FROM family_entitlements
      WHERE source = 'admin'
        AND revoked_at IS NULL
      ORDER BY
        family_id,
        entitlement_key,
        (expires_at IS NULL OR expires_at > NOW()) DESC,
        CASE
          WHEN expires_at IS NULL OR expires_at > NOW() THEN granted_at
        END ASC NULLS LAST,
        granted_at DESC,
        created_at DESC,
        id DESC
    ) keeper
    WHERE fe.source = 'admin'
      AND fe.revoked_at IS NULL
      AND fe.family_id = keeper.family_id
      AND fe.entitlement_key = keeper.entitlement_key
      AND fe.id <> keeper.id
  `);
}

module.exports = {
  name: '1810490000000_family_entitlements_admin_unique',
  snapshotContract: {
    backwardCompatible: true,
    allowedBusinessTableFingerprintChanges: ['family_entitlements'],
  },
  dedupeActiveAdminEntitlements,
  up: async (client) => {
    await dedupeActiveAdminEntitlements(client);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_family_entitlements_admin_unique
        ON family_entitlements (family_id, entitlement_key)
        WHERE source = 'admin' AND revoked_at IS NULL
    `);
  },
  down: async (client) => {
    await client.query('DROP INDEX IF EXISTS idx_family_entitlements_admin_unique');
  },
};
