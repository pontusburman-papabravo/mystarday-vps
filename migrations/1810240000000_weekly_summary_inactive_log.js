/**
 * Parents skipped from Sunday weekly summary due to inactivity — for later re-engagement mail.
 */
module.exports = {
  name: '1810240000000_weekly_summary_inactive_log',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS weekly_summary_inactive_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        parent_id UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
        family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        week_end_date DATE NOT NULL,
        skip_reason VARCHAR(64) NOT NULL DEFAULT 'inactive_4_weeks',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (parent_id, week_end_date)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_weekly_summary_inactive_log_week_end
        ON weekly_summary_inactive_log (week_end_date)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_weekly_summary_inactive_log_family
        ON weekly_summary_inactive_log (family_id)
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS weekly_summary_inactive_log');
  },
};
