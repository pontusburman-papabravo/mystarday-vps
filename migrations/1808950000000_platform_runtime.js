'use strict';

/**
 * Platform Runtime tables — Experience Pack progression, feedback, offline queue.
 */

module.exports = {
  name: '1808950000000_platform_runtime',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS child_progression_node (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        child_id        UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
        family_id       UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        world_slug      VARCHAR(64) NOT NULL,
        node_id         VARCHAR(128) NOT NULL,
        node_type       VARCHAR(32) NOT NULL,
        pack_config_key VARCHAR(256) NOT NULL,
        metadata        JSONB NOT NULL DEFAULT '{}',
        unlocked_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (child_id, node_id)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_child_progression_node_child
        ON child_progression_node (child_id, unlocked_at)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS progression_feedback (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        child_id          UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
        family_id         UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        idempotency_key   VARCHAR(256) NOT NULL UNIQUE,
        feedback_type     VARCHAR(32) NOT NULL,
        payload           JSONB NOT NULL DEFAULT '{}',
        daily_log_item_id UUID,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_progression_feedback_child_item
        ON progression_feedback (child_id, daily_log_item_id)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS progression_event_queue (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        child_id          UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
        family_id         UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        event_type        VARCHAR(64) NOT NULL,
        idempotency_key   VARCHAR(256) NOT NULL UNIQUE,
        payload           JSONB NOT NULL DEFAULT '{}',
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        processed_at      TIMESTAMPTZ
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_progression_event_queue_pending
        ON progression_event_queue (child_id)
        WHERE processed_at IS NULL
    `);

    await client.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, false, $2)
       ON CONFLICT (key) DO NOTHING`,
      ['platform_runtime_enabled', 'Platform Runtime — Experience Pack progression/reward/world integration (default OFF — enable per rollout)']
    );
  },

  down: async (client) => {
    await client.query(`DELETE FROM feature_flag WHERE key = 'platform_runtime_enabled'`);
    await client.query('DROP TABLE IF EXISTS progression_event_queue');
    await client.query('DROP TABLE IF EXISTS progression_feedback');
    await client.query('DROP TABLE IF EXISTS child_progression_node');
  },
};
