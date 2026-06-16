/**
 * För dig — spåra vilken förälder som aktiverade ett mål.
 */
module.exports = {
  name: '1806200000000_for_dig_install_parent',

  up: async (client) => {
    await client.query(`
      ALTER TABLE for_dig_goal_install
        ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES parent(id) ON DELETE SET NULL
    `);

    // Backfill from intent-feedback when possible (same barn + mål).
    await client.query(`
      UPDATE for_dig_goal_install i
      SET parent_id = sub.parent_id
      FROM (
        SELECT DISTINCT ON (f.family_id, f.child_id, f.goal_slug)
               f.family_id, f.child_id, f.goal_slug, f.parent_id
        FROM for_dig_goal_feedback f
        WHERE f.phase = 'intent' AND f.child_id IS NOT NULL
        ORDER BY f.family_id, f.child_id, f.goal_slug, f.created_at DESC
      ) sub
      WHERE i.parent_id IS NULL
        AND i.family_id = sub.family_id
        AND i.child_id = sub.child_id
        AND i.goal_slug = sub.goal_slug
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_for_dig_install_parent_time
        ON for_dig_goal_install (parent_id, installed_at DESC)
        WHERE parent_id IS NOT NULL
    `);
  },

  down: async (client) => {
    await client.query('DROP INDEX IF EXISTS idx_for_dig_install_parent_time');
    await client.query(`
      ALTER TABLE for_dig_goal_install
        DROP COLUMN IF EXISTS parent_id
    `);
  },
};
