/**
 * För dig — goal feedback + install tracking.
 */
module.exports = {
  name: '1806000000000_for_dig_tables',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS for_dig_goal_feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        parent_id UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
        child_id UUID REFERENCES child(id) ON DELETE SET NULL,
        goal_slug VARCHAR(64) NOT NULL,
        phase VARCHAR(32) NOT NULL,
        intent_reason VARCHAR(64),
        outcome_score SMALLINT CHECK (outcome_score IS NULL OR outcome_score BETWEEN 1 AND 4),
        free_text TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_for_dig_feedback_goal_phase
        ON for_dig_goal_feedback (goal_slug, phase, created_at DESC)
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_for_dig_feedback_intent_unique
        ON for_dig_goal_feedback (family_id, child_id, goal_slug)
        WHERE phase = 'intent' AND child_id IS NOT NULL
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_for_dig_feedback_outcome_unique
        ON for_dig_goal_feedback (family_id, child_id, goal_slug)
        WHERE phase = 'outcome' AND child_id IS NOT NULL
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS for_dig_goal_install (
        goal_slug VARCHAR(64) NOT NULL,
        family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
        installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (goal_slug, family_id, child_id)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_for_dig_install_goal_time
        ON for_dig_goal_install (goal_slug, installed_at DESC)
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS for_dig_goal_install');
    await client.query('DROP TABLE IF EXISTS for_dig_goal_feedback');
  },
};
