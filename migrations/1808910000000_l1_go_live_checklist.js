'use strict';

module.exports = {
  name: '1808910000000_l1_go_live_checklist',

  up: async (client) => {
    await client.query(`
      ALTER TABLE l1_governance_release
        ADD COLUMN IF NOT EXISTS go_live_checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS l1_primary_owner VARCHAR(100),
        ADD COLUMN IF NOT EXISTS l1_backup_owner VARCHAR(100),
        ADD COLUMN IF NOT EXISTS review_day_7_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS review_day_14_at TIMESTAMPTZ
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE l1_governance_release
        DROP COLUMN IF EXISTS go_live_checklist,
        DROP COLUMN IF EXISTS l1_primary_owner,
        DROP COLUMN IF EXISTS l1_backup_owner,
        DROP COLUMN IF EXISTS review_day_7_at,
        DROP COLUMN IF EXISTS review_day_14_at
    `);
  },
};
