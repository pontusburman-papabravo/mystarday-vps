'use strict';

/**
 * RET-3 — push dag 3/7/14 för aktiverade familjer som slutat logga in.
 */

module.exports = {
  name: '1808700000000_retention_reengagement_push',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS retention_reengagement_push (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        parent_id UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
        family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        milestone_day SMALLINT NOT NULL CHECK (milestone_day IN (3, 7, 14)),
        sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (parent_id, family_id, milestone_day)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_retention_reengagement_family
        ON retention_reengagement_push (family_id, milestone_day)
    `);
    await client.query(`
      INSERT INTO feature_flag (key, enabled, description)
      VALUES (
        'retention_reengagement_v1',
        false,
        'RET-3: push dag 3/7/14 för aktiverade familjer utan aktivitet'
      )
      ON CONFLICT (key) DO NOTHING
    `);
  },

  down: async (client) => {
    await client.query(`DELETE FROM feature_flag WHERE key = 'retention_reengagement_v1'`);
    await client.query('DROP TABLE IF EXISTS retention_reengagement_push');
  },
};
