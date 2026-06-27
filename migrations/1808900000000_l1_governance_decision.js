'use strict';

/**
 * L1 governance decision log — human decisions for coach release ops.
 */

module.exports = {
  name: '1808900000000_l1_governance_decision',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS l1_governance_release (
        release_id VARCHAR(64) PRIMARY KEY,
        started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        state VARCHAR(16) NOT NULL DEFAULT 'LEARNING'
          CHECK (state IN ('LEARNING', 'STABLE', 'DRIFT')),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS l1_governance_decision (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        release_id VARCHAR(64) NOT NULL REFERENCES l1_governance_release(release_id),
        decision_type VARCHAR(32) NOT NULL,
        log_line TEXT NOT NULL,
        answers JSONB NOT NULL DEFAULT '{}'::jsonb,
        owner_label VARCHAR(100),
        parent_id UUID REFERENCES parent(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_l1_governance_decision_release
        ON l1_governance_decision (release_id, created_at DESC)
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS l1_governance_decision');
    await client.query('DROP TABLE IF EXISTS l1_governance_release');
  },
};
