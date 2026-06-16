/**
 * För dig — goal favorites + is_favorite on reward/schedule templates.
 */
module.exports = {
  name: '1806100000000_for_dig_favorites',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS for_dig_goal_favorite (
        family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        parent_id UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
        goal_slug VARCHAR(64) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (parent_id, goal_slug)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_for_dig_goal_favorite_family
        ON for_dig_goal_favorite (family_id, goal_slug)
    `);

    await client.query(`
      ALTER TABLE reward
        ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false
    `);

    await client.query(`
      ALTER TABLE weekly_schedule
        ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false
    `);
  },

  down: async (client) => {
    await client.query('ALTER TABLE weekly_schedule DROP COLUMN IF EXISTS is_favorite');
    await client.query('ALTER TABLE reward DROP COLUMN IF EXISTS is_favorite');
    await client.query('DROP TABLE IF EXISTS for_dig_goal_favorite');
  },
};
