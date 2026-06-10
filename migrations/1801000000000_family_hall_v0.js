/**
 * Family Hall V0 — event-sourced family memory (projects, events, chest).
 * Relationship layer: derived from activity contributions, no child UI writes.
 */
module.exports = {
  name: '1801000000000_family_hall_v0',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS family_project (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_id     UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        title         VARCHAR(128) NOT NULL,
        emoji         VARCHAR(16) NOT NULL DEFAULT '🎯',
        target_value  INTEGER NOT NULL DEFAULT 100 CHECK (target_value > 0),
        current_value INTEGER NOT NULL DEFAULT 0 CHECK (current_value >= 0),
        status        VARCHAR(16) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'completed', 'archived')),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS family_project_family_status_idx
        ON family_project (family_id, status, created_at DESC)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS family_event (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_id   UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        child_id    UUID REFERENCES child(id) ON DELETE SET NULL,
        type        VARCHAR(64) NOT NULL,
        payload     JSONB NOT NULL DEFAULT '{}',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS family_event_family_created_idx
        ON family_event (family_id, created_at DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS family_event_family_type_idx
        ON family_event (family_id, type, created_at DESC)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS family_chest (
        family_id   UUID PRIMARY KEY REFERENCES family(id) ON DELETE CASCADE,
        total_stars INTEGER NOT NULL DEFAULT 0 CHECK (total_stars >= 0),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS family_chest');
    await client.query('DROP TABLE IF EXISTS family_event');
    await client.query('DROP TABLE IF EXISTS family_project');
  },
};
