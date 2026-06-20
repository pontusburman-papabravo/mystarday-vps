/**
 * waitlist survey columns — pain-point Q1/Q2 from /en/thank-you page.
 * Referenced in db/waitlist.js but never migrated.
 */
module.exports = {
  name: '1807300000000_waitlist_survey',

  up: async (client) => {
    await client.query(`
      ALTER TABLE waitlist
      ADD COLUMN IF NOT EXISTS pain_points TEXT[],
      ADD COLUMN IF NOT EXISTS pain_points_other TEXT,
      ADD COLUMN IF NOT EXISTS current_method VARCHAR(64),
      ADD COLUMN IF NOT EXISTS survey_completed_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS survey_skipped_at TIMESTAMPTZ
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE waitlist
      DROP COLUMN IF EXISTS survey_skipped_at,
      DROP COLUMN IF EXISTS survey_completed_at,
      DROP COLUMN IF EXISTS current_method,
      DROP COLUMN IF EXISTS pain_points_other,
      DROP COLUMN IF EXISTS pain_points
    `);
  },
};
