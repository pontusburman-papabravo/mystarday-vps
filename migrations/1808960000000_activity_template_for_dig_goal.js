'use strict';

/**
 * Link activity_template rows to a För dig goal (icon + color badge in parent/child UI).
 */
module.exports = {
  name: '1808960000000_activity_template_for_dig_goal',

  up: async (client) => {
    await client.query(`
      ALTER TABLE activity_template
        ADD COLUMN IF NOT EXISTS for_dig_goal_slug VARCHAR(64)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_template_for_dig_goal
        ON activity_template (family_id, for_dig_goal_slug)
        WHERE for_dig_goal_slug IS NOT NULL
    `);
  },

  down: async (client) => {
    await client.query('DROP INDEX IF EXISTS idx_activity_template_for_dig_goal');
    await client.query(`
      ALTER TABLE activity_template DROP COLUMN IF EXISTS for_dig_goal_slug
    `);
  },
};
