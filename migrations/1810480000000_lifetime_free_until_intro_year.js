'use strict';

/**
 * Split lifetime-free cutoff from IAP go-live.
 * Registered before 2026-09-14 00:00 Europe/Stockholm → grandfathered worldwide.
 * Later signups receive a one-year intro entitlement (granted in app code).
 */

const DEFAULT_LIFETIME_FREE_UNTIL = '2026-09-14T00:00:00+02:00';

module.exports = {
  name: '1810480000000_lifetime_free_until_intro_year',
  up: async (client) => {
    await client.query(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES ('lifetime_free_until', $1::jsonb, NOW())
      ON CONFLICT (key) DO NOTHING
    `, [JSON.stringify(DEFAULT_LIFETIME_FREE_UNTIL)]);

    await client.query(`
      INSERT INTO app_config (key, value, description, updated_at)
      VALUES (
        'lifetime_free_until',
        $1,
        'Lifetime-free registration cutoff (Europe/Stockholm). Later signups get one intro year.',
        NOW()
      )
      ON CONFLICT (key) DO NOTHING
    `, [DEFAULT_LIFETIME_FREE_UNTIL]);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_family_entitlements_intro_year_unique
        ON family_entitlements (family_id, entitlement_key)
        WHERE source = 'intro_year' AND revoked_at IS NULL
    `);

    const backfill = await client.query(`
      INSERT INTO family_entitlements (
        family_id, entitlement_key, source, source_reference, status,
        starts_at, expires_at, granted_at, metadata
      )
      SELECT
        f.id,
        'basic',
        'grandfathered',
        'lifetime_free_until_cutoff',
        'grandfathered',
        f.created_at,
        NULL,
        NOW(),
        jsonb_build_object(
          'backfill', true,
          'worldwide', true,
          'lifetime_free_until', $1::text,
          'country_code', f.country_code
        )
      FROM family f
      WHERE f.created_at < $2::timestamptz
        AND NOT EXISTS (
          SELECT 1 FROM family_entitlements fe
          WHERE fe.family_id = f.id
            AND fe.entitlement_key = 'basic'
            AND fe.source = 'grandfathered'
            AND fe.revoked_at IS NULL
        )
      RETURNING family_id
    `, [DEFAULT_LIFETIME_FREE_UNTIL, DEFAULT_LIFETIME_FREE_UNTIL]);

    if (backfill.rowCount > 0) {
      await client.query(`
        UPDATE family f
        SET is_lifetime_free = true,
            updated_at = NOW()
        WHERE f.id = ANY($1::uuid[])
      `, [backfill.rows.map((r) => r.family_id)]);
    }
  },

  down: async (client) => {
    await client.query('DROP INDEX IF EXISTS idx_family_entitlements_intro_year_unique');
    await client.query(`
      DELETE FROM family_entitlements
      WHERE source = 'intro_year'
        AND source_reference = 'intro_year_grant'
    `);
    const removed = await client.query(`
      DELETE FROM family_entitlements
      WHERE source = 'grandfathered'
        AND source_reference = 'lifetime_free_until_cutoff'
        AND metadata->>'worldwide' = 'true'
      RETURNING family_id
    `);
    if (removed.rowCount > 0) {
      await client.query(`
        UPDATE family f
        SET is_lifetime_free = false,
            updated_at = NOW()
        WHERE f.id = ANY($1::uuid[])
          AND NOT EXISTS (
            SELECT 1 FROM family_entitlements fe
            WHERE fe.family_id = f.id
              AND fe.source = 'grandfathered'
              AND fe.revoked_at IS NULL
          )
      `, [removed.rows.map((r) => r.family_id)]);
    }
    await client.query(`DELETE FROM app_settings WHERE key = 'lifetime_free_until'`);
    await client.query(`DELETE FROM app_config WHERE key = 'lifetime_free_until'`);
  },
};
