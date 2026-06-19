/**
 * Paket v1.2 Fas 0 — rollout default, component_state, grandfathering.
 * Safe to deploy: PACKAGES_ROLLOUT_MODE defaults to 'off'.
 */
module.exports = {
  name: '1806800000000_packages_v12_foundation',

  up: async (client) => {
    await client.query(`
      INSERT INTO app_config (key, value, description)
      VALUES (
        'PACKAGES_ROLLOUT_MODE',
        'off',
        'Paket rollout: off | interest | purchase (§9.8)'
      )
      ON CONFLICT (key) DO NOTHING
    `);

    // Backfill state/source on existing component entries
    await client.query(`
      UPDATE family_subscriptions
      SET components = sub.normalized,
          updated_at = NOW()
      FROM (
        SELECT
          fs.family_id,
          COALESCE(
            jsonb_agg(
              elem
              || jsonb_build_object(
                'state', COALESCE(elem->>'state', 'active'),
                'source', COALESCE(elem->>'source', 'migration')
              )
            ),
            '[]'::jsonb
          ) AS normalized
        FROM family_subscriptions fs,
             jsonb_array_elements(fs.components) AS elem
        GROUP BY fs.family_id
      ) sub
      WHERE family_subscriptions.family_id = sub.family_id
    `);

    // Grandfather reporting — families with share links
    await client.query(`
      WITH reporting_families AS (
        SELECT DISTINCT family_id
        FROM professional_share_link
        WHERE revoked_at IS NULL
      )
      UPDATE family_subscriptions fs
      SET components = (
        SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
        FROM (
          SELECT item
          FROM jsonb_array_elements(fs.components) WITH ORDINALITY arr(item, ord)
          WHERE (item->>'component') != 'reporting'
          UNION ALL
          SELECT jsonb_build_object(
            'component', 'reporting',
            'state', 'active',
            'source', 'grandfather',
            'granted_at', NOW()::text,
            'expires_at', NULL,
            'archived_at', NULL
          )
        ) sub
      ),
      updated_at = NOW()
      FROM reporting_families rf
      WHERE fs.family_id = rf.family_id
        AND NOT has_component(fs.family_id, 'reporting')
    `);

    // Grandfather pedagog — families with active pedagog links
    await client.query(`
      WITH pedagog_families AS (
        SELECT DISTINCT c.family_id
        FROM parent_child pc
        JOIN child c ON c.id = pc.child_id
        WHERE pc.role = 'pedagog'
          AND pc.revoked_at IS NULL
      )
      UPDATE family_subscriptions fs
      SET components = (
        SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
        FROM (
          SELECT item
          FROM jsonb_array_elements(fs.components) WITH ORDINALITY arr(item, ord)
          WHERE (item->>'component') != 'pedagog'
          UNION ALL
          SELECT jsonb_build_object(
            'component', 'pedagog',
            'state', 'active',
            'source', 'grandfather',
            'granted_at', NOW()::text,
            'expires_at', NULL,
            'archived_at', NULL
          )
        ) sub
      ),
      updated_at = NOW()
      FROM pedagog_families pf
      WHERE fs.family_id = pf.family_id
        AND NOT has_component(fs.family_id, 'pedagog')
    `);

    // has_component: active or archived (not disabled / expired)
    await client.query(`
      CREATE OR REPLACE FUNCTION has_component(p_family_id UUID, p_component TEXT)
      RETURNS BOOLEAN
      LANGUAGE sql
      STABLE
      AS $$
        SELECT EXISTS (
          SELECT 1
          FROM family_subscriptions fs,
               jsonb_array_elements(fs.components) AS elem
          WHERE fs.family_id = p_family_id
            AND elem->>'component' = p_component
            AND COALESCE(elem->>'state', 'active') IN ('active', 'archived')
            AND (
              elem->>'expires_at' IS NULL
              OR (elem->>'expires_at')::timestamptz > NOW()
            )
        );
      $$;
    `);
  },

  down: async (client) => {
    await client.query(`DELETE FROM app_config WHERE key = 'PACKAGES_ROLLOUT_MODE'`);

    await client.query(`
      CREATE OR REPLACE FUNCTION has_component(p_family_id UUID, p_component TEXT)
      RETURNS BOOLEAN
      LANGUAGE sql
      STABLE
      AS $$
        SELECT EXISTS (
          SELECT 1
          FROM family_subscriptions fs,
               jsonb_array_elements(fs.components) AS elem
          WHERE fs.family_id = p_family_id
            AND elem->>'component' = p_component
            AND (
              elem->>'expires_at' IS NULL
              OR (elem->>'expires_at')::timestamptz > NOW()
            )
        );
      $$;
    `);
  },
};
