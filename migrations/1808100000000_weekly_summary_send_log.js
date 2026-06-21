/**
 * Dedupe log for weekly summary emails — one send per parent per week.
 */
module.exports = {
  name: '1808100000000_weekly_summary_send_log',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS weekly_summary_send_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        parent_id UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
        week_end_date DATE NOT NULL,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (parent_id, week_end_date)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_weekly_summary_send_log_week_end
        ON weekly_summary_send_log (week_end_date)
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS weekly_summary_send_log');
  },
};
