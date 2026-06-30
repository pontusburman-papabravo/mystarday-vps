'use strict';

/**
 * Living Objects Engine — persistence + garden_playable feature gate.
 * Sprint 0 PR-S0-1: schema + dev feature registration only (no family allowlist).
 */

module.exports = {
  name: '1809140000000_living_object_instance',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS living_object_instance (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        child_id        UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
        family_id       UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        world_slug      VARCHAR(64) NOT NULL,
        archetype_id    VARCHAR(128) NOT NULL,
        slot_id         VARCHAR(128) NOT NULL DEFAULT 'default',
        state_key       VARCHAR(64) NOT NULL,
        state_data      JSONB NOT NULL DEFAULT '{}',
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (child_id, world_slug, slot_id)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_living_object_instance_child_world
        ON living_object_instance (child_id, world_slug)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_living_object_instance_family
        ON living_object_instance (family_id)
    `);

    await client.query(
      `INSERT INTO features (slug, name, description, status, tags, priority, complexity, estimated_hours)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (slug) DO UPDATE SET
         status = 'dev',
         updated_at = NOW()`,
      [
        'garden_playable',
        'Trädgården (spelbar)',
        'Första spelbara trädgården i barnets Min värld — per-familj dev-rollout',
        'dev',
        ['barn', 'belöningar'],
        'high',
        5,
        12.0,
      ]
    );
  },

  down: async (client) => {
    await client.query(
      `DELETE FROM family_features WHERE feature_slug = 'garden_playable'`
    );
    await client.query(
      `DELETE FROM features WHERE slug = 'garden_playable'`
    );
    await client.query('DROP TABLE IF EXISTS living_object_instance');
  },
};
