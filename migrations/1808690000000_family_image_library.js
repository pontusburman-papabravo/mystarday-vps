'use strict';

/**
 * Family image library — parents upload photos once, reuse on activities.
 * activity_template.image_url + daily_log_item.image_url for barnvy snapshots.
 */

module.exports = {
  name: '1808690000000_family_image_library',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS family_image (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        label VARCHAR(120),
        image_url TEXT NOT NULL,
        sort_order SMALLINT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_family_image_family ON family_image (family_id)
    `);

    await client.query(`
      ALTER TABLE activity_template
        ADD COLUMN IF NOT EXISTS image_url TEXT
    `);

    await client.query(`
      ALTER TABLE daily_log_item
        ADD COLUMN IF NOT EXISTS image_url TEXT
    `);
  },

  down: async (client) => {
    await client.query('ALTER TABLE daily_log_item DROP COLUMN IF EXISTS image_url');
    await client.query('ALTER TABLE activity_template DROP COLUMN IF EXISTS image_url');
    await client.query('DROP TABLE IF EXISTS family_image');
  },
};
