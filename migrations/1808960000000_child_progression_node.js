/**
 * ADR-004 — child_progression_node authoritative unlock state.
 */
module.exports = {
  name: '1808960000000_child_progression_node',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS child_progression_node (
        child_id      UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
        world_slug    VARCHAR(64) NOT NULL,
        node_id       VARCHAR(128) NOT NULL,
        unlocked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        metadata      JSONB NOT NULL DEFAULT '{}',
        PRIMARY KEY (child_id, world_slug, node_id)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS child_progression_node_child_world_idx
        ON child_progression_node (child_id, world_slug, unlocked_at DESC)
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS child_progression_node');
  },
};
