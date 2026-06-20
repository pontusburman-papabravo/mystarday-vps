/**
 * Survey popup + contest columns (Del 4) — referenced in db/surveys.js but never migrated.
 * Fixes: column "popup_landing_enabled" does not exist (prod journal 2026-06-20).
 */
async function tableExists(client, tableName) {
  const res = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return res.rowCount > 0;
}

module.exports = {
  name: '1807400000000_survey_popup_columns',

  up: async (client) => {
    if (!(await tableExists(client, 'surveys'))) {
      return;
    }

    await client.query(`
      ALTER TABLE surveys
        ADD COLUMN IF NOT EXISTS popup_logged_in_enabled BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS popup_landing_enabled BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS popup_trigger_delay_secs INTEGER DEFAULT 8,
        ADD COLUMN IF NOT EXISTS popup_trigger_scroll_pct INTEGER,
        ADD COLUMN IF NOT EXISTS popup_start_date TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS popup_end_date TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS popup_registered_after TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS popup_registered_before TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS popup_impression_count INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS contest_enabled BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS contest_prize_description TEXT,
        ADD COLUMN IF NOT EXISTS contest_prize_image_url TEXT,
        ADD COLUMN IF NOT EXISTS contest_winner_count INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS contest_closes_at TIMESTAMPTZ
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS survey_popup_interactions (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        survey_id    UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        parent_id    UUID REFERENCES parent(id) ON DELETE SET NULL,
        cookie_token VARCHAR(255),
        action       VARCHAR(32) NOT NULL,
        snooze_until TIMESTAMPTZ,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_survey_popup_interactions_survey_parent
      ON survey_popup_interactions (survey_id, parent_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_survey_popup_interactions_survey_cookie
      ON survey_popup_interactions (survey_id, cookie_token)
    `);

    if (await tableExists(client, 'survey_responses')) {
      await client.query(`
        CREATE TABLE IF NOT EXISTS survey_contest_entries (
          id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          survey_id         UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
          response_id       UUID NOT NULL UNIQUE REFERENCES survey_responses(id) ON DELETE CASCADE,
          respondent_email  VARCHAR(255) NOT NULL,
          is_winner         BOOLEAN NOT NULL DEFAULT false,
          is_contacted      BOOLEAN NOT NULL DEFAULT false,
          created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_survey_contest_entries_survey
        ON survey_contest_entries (survey_id)
      `);
    }
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS survey_contest_entries');
    await client.query('DROP TABLE IF EXISTS survey_popup_interactions');

    await client.query(`
      ALTER TABLE surveys
        DROP COLUMN IF EXISTS contest_closes_at,
        DROP COLUMN IF EXISTS contest_winner_count,
        DROP COLUMN IF EXISTS contest_prize_image_url,
        DROP COLUMN IF EXISTS contest_prize_description,
        DROP COLUMN IF EXISTS contest_enabled,
        DROP COLUMN IF EXISTS view_count,
        DROP COLUMN IF EXISTS popup_impression_count,
        DROP COLUMN IF EXISTS popup_registered_before,
        DROP COLUMN IF EXISTS popup_registered_after,
        DROP COLUMN IF EXISTS popup_end_date,
        DROP COLUMN IF EXISTS popup_start_date,
        DROP COLUMN IF EXISTS popup_trigger_scroll_pct,
        DROP COLUMN IF EXISTS popup_trigger_delay_secs,
        DROP COLUMN IF EXISTS popup_landing_enabled,
        DROP COLUMN IF EXISTS popup_logged_in_enabled
    `);
  },
};
