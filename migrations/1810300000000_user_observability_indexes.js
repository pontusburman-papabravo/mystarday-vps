'use strict';

/**
 * Indexes for user observability queries (analytics actor/session lookups).
 */

module.exports = {
  name: '1810300000000_user_observability_indexes',

  up: async (client) => {
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_events_actor_activity
        ON analytics_events ((metadata->>'actor_id'), created_at DESC)
        WHERE metadata->>'actor_id' IS NOT NULL
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_events_session_type_time
        ON analytics_events (event_type, created_at DESC)
        WHERE event_type IN ('parent_session_started', 'child_session_started')
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_login_event_family_time
        ON login_event (family_id, occurred_at DESC)
    `);
  },

  down: async (client) => {
    await client.query('DROP INDEX IF EXISTS idx_analytics_events_actor_activity');
    await client.query('DROP INDEX IF EXISTS idx_analytics_events_session_type_time');
    await client.query('DROP INDEX IF EXISTS idx_login_event_family_time');
  },
};
