'use strict';

/**
 * Ensure columns/tables required by POST /api/children exist on VPS
 * (harvest/bootstrap may predate baseline-schema.sql additions).
 */
module.exports = {
  name: '1803000000000_ensure_child_create_schema',

  up: async (client) => {
    const alters = [
      'ALTER TABLE child ADD COLUMN IF NOT EXISTS username VARCHAR(64)',
      'ALTER TABLE child ADD COLUMN IF NOT EXISTS pin_fingerprint TEXT',
      'ALTER TABLE child ADD COLUMN IF NOT EXISTS avatar_url TEXT',
      'ALTER TABLE child ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE category ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false',
      'ALTER TABLE default_schedule_item ADD COLUMN IF NOT EXISTS sub_steps JSONB DEFAULT \'[]\'::jsonb',
      'ALTER TABLE weekly_schedule_item ADD COLUMN IF NOT EXISTS section VARCHAR(32) DEFAULT \'morgon\'',
    ];
    for (const sql of alters) {
      await client.query(sql);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_sub_step (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        activity_template_id UUID NOT NULL REFERENCES activity_template(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        icon VARCHAR(64) DEFAULT '⭐',
        sort_order INTEGER DEFAULT 0
      )
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS child_username_idx
      ON child (username) WHERE username IS NOT NULL
    `);
  },
};
