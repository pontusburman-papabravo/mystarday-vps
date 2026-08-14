'use strict';

/**
 * Standard library v1.1 — additive canonical schema foundation (PR 1A).
 * Extends existing default_* tables; no data migration or runtime behavior change.
 */
module.exports = {
  name: '1810290000000_standard_library_v11_foundation',

  up: async (client) => {
    await client.query(`
      ALTER TABLE default_activity_template
        ADD COLUMN IF NOT EXISTS canonical_id TEXT,
        ADD COLUMN IF NOT EXISTS name_i18n JSONB,
        ADD COLUMN IF NOT EXISTS icon_key VARCHAR(64),
        ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
        ADD COLUMN IF NOT EXISTS variants JSONB NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS deprecated BOOLEAN NOT NULL DEFAULT false
    `);

    await client.query(`
      ALTER TABLE default_activity_template
        DROP CONSTRAINT IF EXISTS default_activity_template_duration_seconds_range
    `);
    await client.query(`
      ALTER TABLE default_activity_template
        ADD CONSTRAINT default_activity_template_duration_seconds_range
        CHECK (duration_seconds IS NULL OR (duration_seconds >= 5 AND duration_seconds <= 3600))
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_default_activity_template_canonical_id
        ON default_activity_template (canonical_id)
        WHERE canonical_id IS NOT NULL
    `);

    await client.query(`
      ALTER TABLE default_schedule
        ADD COLUMN IF NOT EXISTS canonical_id TEXT,
        ADD COLUMN IF NOT EXISTS name_i18n JSONB,
        ADD COLUMN IF NOT EXISTS description_i18n JSONB,
        ADD COLUMN IF NOT EXISTS deprecated BOOLEAN NOT NULL DEFAULT false
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_default_schedule_canonical_id
        ON default_schedule (canonical_id)
        WHERE canonical_id IS NOT NULL
    `);

    await client.query(`
      ALTER TABLE default_schedule_item
        ADD COLUMN IF NOT EXISTS is_optional BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS variant_key TEXT
    `);

    await client.query(`
      ALTER TABLE activity_template
        ADD COLUMN IF NOT EXISTS source_default_activity_id UUID
          REFERENCES default_activity_template(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS source_canonical_id TEXT
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE activity_template DROP COLUMN IF EXISTS source_canonical_id
    `);
    await client.query(`
      ALTER TABLE activity_template DROP COLUMN IF EXISTS source_default_activity_id
    `);

    await client.query(`
      ALTER TABLE default_schedule_item DROP COLUMN IF EXISTS variant_key
    `);
    await client.query(`
      ALTER TABLE default_schedule_item DROP COLUMN IF EXISTS is_optional
    `);

    await client.query('DROP INDEX IF EXISTS idx_default_schedule_canonical_id');

    await client.query(`
      ALTER TABLE default_schedule DROP COLUMN IF EXISTS deprecated
    `);
    await client.query(`
      ALTER TABLE default_schedule DROP COLUMN IF EXISTS description_i18n
    `);
    await client.query(`
      ALTER TABLE default_schedule DROP COLUMN IF EXISTS name_i18n
    `);
    await client.query(`
      ALTER TABLE default_schedule DROP COLUMN IF EXISTS canonical_id
    `);

    await client.query('DROP INDEX IF EXISTS idx_default_activity_template_canonical_id');

    await client.query(`
      ALTER TABLE default_activity_template
        DROP CONSTRAINT IF EXISTS default_activity_template_duration_seconds_range
    `);

    await client.query(`
      ALTER TABLE default_activity_template DROP COLUMN IF EXISTS deprecated
    `);
    await client.query(`
      ALTER TABLE default_activity_template DROP COLUMN IF EXISTS variants
    `);
    await client.query(`
      ALTER TABLE default_activity_template DROP COLUMN IF EXISTS duration_seconds
    `);
    await client.query(`
      ALTER TABLE default_activity_template DROP COLUMN IF EXISTS icon_key
    `);
    await client.query(`
      ALTER TABLE default_activity_template DROP COLUMN IF EXISTS name_i18n
    `);
    await client.query(`
      ALTER TABLE default_activity_template DROP COLUMN IF EXISTS canonical_id
    `);
  },
};
