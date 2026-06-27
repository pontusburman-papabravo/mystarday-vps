/**
 * Survey respondent core tables — questions, options, responses, answers, participants.
 * Prod had `surveys` + popup tables but never got respondent schema (2026-06-27).
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
  name: '1808920000000_survey_respondent_core',

  up: async (client) => {
    if (!(await tableExists(client, 'surveys'))) {
      await client.query(`
        CREATE TABLE surveys (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          slug TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          description TEXT,
          target_tag TEXT,
          status TEXT NOT NULL DEFAULT 'draft',
          opens_at TIMESTAMPTZ,
          closes_at TIMESTAMPTZ,
          thank_you_message TEXT,
          thank_you_cta_text TEXT,
          thank_you_cta_url TEXT,
          view_count INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS survey_questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        question_text TEXT NOT NULL,
        question_type VARCHAR(32) NOT NULL,
        scale_min SMALLINT,
        scale_max SMALLINT,
        scale_min_label TEXT,
        scale_max_label TEXT,
        is_required BOOLEAN NOT NULL DEFAULT true,
        condition_question_id UUID,
        condition_option_id UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_survey_questions_survey_sort
      ON survey_questions (survey_id, sort_order)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS survey_options (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        question_id UUID NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        option_text TEXT NOT NULL,
        allows_freetext BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_survey_options_question_sort
      ON survey_options (question_id, sort_order)
    `);

    await client.query(`
      DO $$ BEGIN
        ALTER TABLE survey_questions
          ADD CONSTRAINT survey_questions_condition_question_fk
          FOREIGN KEY (condition_question_id) REFERENCES survey_questions(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await client.query(`
      DO $$ BEGIN
        ALTER TABLE survey_questions
          ADD CONSTRAINT survey_questions_condition_option_fk
          FOREIGN KEY (condition_option_id) REFERENCES survey_options(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS survey_responses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        fingerprint TEXT,
        status VARCHAR(32) NOT NULL DEFAULT 'in_progress',
        gdpr_consent BOOLEAN NOT NULL DEFAULT false,
        respondent_email VARCHAR(255),
        submitted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_status
      ON survey_responses (survey_id, status)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS survey_response_answers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        response_id UUID NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
        question_id UUID NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
        answer_text TEXT,
        selected_option_ids UUID[] NOT NULL DEFAULT '{}',
        freetext_value TEXT,
        scale_value SMALLINT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (response_id, question_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS survey_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        response_id UUID NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
        cookie_token VARCHAR(255),
        fingerprint TEXT,
        ip_hash VARCHAR(64),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_survey_participants_survey_cookie
      ON survey_participants (survey_id, cookie_token)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS survey_contest_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        response_id UUID NOT NULL UNIQUE REFERENCES survey_responses(id) ON DELETE CASCADE,
        respondent_email VARCHAR(255) NOT NULL,
        is_winner BOOLEAN NOT NULL DEFAULT false,
        is_contacted BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_survey_contest_entries_survey
      ON survey_contest_entries (survey_id)
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS survey_contest_entries');
    await client.query('DROP TABLE IF EXISTS survey_participants');
    await client.query('DROP TABLE IF EXISTS survey_response_answers');
    await client.query('DROP TABLE IF EXISTS survey_responses');
    await client.query('DROP TABLE IF EXISTS survey_options');
    await client.query('DROP TABLE IF EXISTS survey_questions');
  },
};
