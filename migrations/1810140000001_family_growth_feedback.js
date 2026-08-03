'use strict';

/**
 * Short, journey-gated growth feedback responses (one answer per prompt per family).
 */

module.exports = {
  name: '1810140000001_family_growth_feedback',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS family_growth_feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        prompt_key VARCHAR(64) NOT NULL,
        answer VARCHAR(64) NOT NULL,
        comment VARCHAR(500),
        context JSONB NOT NULL DEFAULT '{}'::jsonb,
        locale VARCHAR(16),
        platform VARCHAR(32),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT family_growth_feedback_prompt_chk CHECK (
          prompt_key IN (
            'first_value',
            'three_routine_days',
            'stuck_blocker',
            'onboarding_no_child_access',
            'account_delete'
          )
        )
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_family_growth_feedback_once
        ON family_growth_feedback (family_id, prompt_key)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_family_growth_feedback_created
        ON family_growth_feedback (created_at DESC)
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS family_growth_feedback');
  },
};
