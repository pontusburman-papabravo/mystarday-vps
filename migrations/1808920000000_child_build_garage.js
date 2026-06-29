/**
 * Build loop — projects + garage customization (Fas A/B).
 */
module.exports = {
  name: '1808920000000_child_build_garage',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS build_project_catalog (
        slug            VARCHAR(32) PRIMARY KEY,
        name            VARCHAR(64) NOT NULL,
        icon            VARCHAR(16) NOT NULL DEFAULT '🚗',
        parts_required  SMALLINT NOT NULL DEFAULT 6,
        season_slug     VARCHAR(32) NOT NULL DEFAULT 'vehicles',
        unlock_label    VARCHAR(128),
        sort_order      SMALLINT NOT NULL DEFAULT 0
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS child_build_project (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        child_id          UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
        catalog_slug      VARCHAR(32) NOT NULL REFERENCES build_project_catalog(slug),
        status            VARCHAR(16) NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'completed', 'archived')),
        parts_collected   SMALLINT NOT NULL DEFAULT 0,
        garage_unlocked   BOOLEAN NOT NULL DEFAULT false,
        customization     JSONB NOT NULL DEFAULT '{}',
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS child_build_project_child_idx
        ON child_build_project (child_id, status)
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS child_build_project_child_catalog_uidx
        ON child_build_project (child_id, catalog_slug)
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS child_build_project_one_active_idx
        ON child_build_project (child_id)
        WHERE status = 'active'
    `);

    await client.query(`
      INSERT INTO build_project_catalog (slug, name, icon, parts_required, season_slug, unlock_label, sort_order)
      VALUES
        ('racerbil', 'Racerbil', '🚗', 6, 'vehicles', 'Garaget', 1),
        ('dinosaurie', 'Dinosaurie', '🦖', 10, 'dinosaurs', 'Dino-dal', 2),
        ('rymdraket', 'Rymdraket', '🚀', 12, 'space', 'Rymdbas', 3),
        ('kompis', 'Kompis', '👧', 8, 'friends', 'Hem', 4),
        ('valp', 'Valp', '🐶', 8, 'pets', 'Hundkoja', 5)
      ON CONFLICT (slug) DO NOTHING
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS child_build_project');
    await client.query('DROP TABLE IF EXISTS build_project_catalog');
  },
};
