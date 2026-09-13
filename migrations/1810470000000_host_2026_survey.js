'use strict';

/**
 * Host 2026 campaign survey:
 * - Create survey tables if missing (schema drift: they existed in prod but not in migrations)
 * - max_selections, post-submit contest, email uniqueness, 18+ flag
 * - Seed slug host-2026
 */

const {
  HOST_2026_SURVEY_SLUG,
  HOST_2026_CLOSES_AT,
  materializeHost2026Survey,
} = require('../config/host-2026-survey');

async function tableExists(client, tableName) {
  const res = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return res.rowCount > 0;
}

async function ensureSurveyTables(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS surveys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug VARCHAR(80) NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      target_tag VARCHAR(120),
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      opens_at TIMESTAMPTZ,
      closes_at TIMESTAMPTZ,
      thank_you_message TEXT,
      thank_you_cta_text TEXT,
      thank_you_cta_url TEXT,
      popup_logged_in_enabled BOOLEAN NOT NULL DEFAULT false,
      popup_landing_enabled BOOLEAN NOT NULL DEFAULT false,
      popup_trigger_delay_secs INTEGER DEFAULT 8,
      popup_trigger_scroll_pct INTEGER,
      popup_start_date TIMESTAMPTZ,
      popup_end_date TIMESTAMPTZ,
      popup_registered_after TIMESTAMPTZ,
      popup_registered_before TIMESTAMPTZ,
      popup_impression_count INTEGER NOT NULL DEFAULT 0,
      view_count INTEGER NOT NULL DEFAULT 0,
      contest_enabled BOOLEAN NOT NULL DEFAULT false,
      contest_prize_description TEXT,
      contest_prize_image_url TEXT,
      contest_winner_count INTEGER DEFAULT 1,
      contest_closes_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS survey_questions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      question_text TEXT NOT NULL,
      question_type VARCHAR(32) NOT NULL,
      scale_min INTEGER,
      scale_max INTEGER,
      scale_min_label TEXT,
      scale_max_label TEXT,
      is_required BOOLEAN NOT NULL DEFAULT true,
      condition_question_id UUID REFERENCES survey_questions(id) ON DELETE SET NULL,
      condition_option_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS survey_options (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      question_id UUID NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      option_text TEXT NOT NULL,
      allows_freetext BOOLEAN NOT NULL DEFAULT false
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS survey_responses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      fingerprint VARCHAR(64),
      status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
      submitted_at TIMESTAMPTZ,
      gdpr_consent BOOLEAN NOT NULL DEFAULT false,
      respondent_email VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS survey_response_answers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      response_id UUID NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
      question_id UUID NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
      answer_text TEXT,
      selected_option_ids UUID[] DEFAULT '{}',
      freetext_value TEXT,
      scale_value INTEGER,
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
      fingerprint VARCHAR(64),
      ip_hash VARCHAR(32),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  if (await tableExists(client, 'survey_responses')) {
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
  }

  await client.query(`
    CREATE TABLE IF NOT EXISTS survey_popup_interactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      parent_id UUID REFERENCES parent(id) ON DELETE SET NULL,
      cookie_token VARCHAR(255),
      action VARCHAR(32) NOT NULL,
      snooze_until TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function addCampaignColumns(client) {
  await client.query(`
    ALTER TABLE surveys
      ADD COLUMN IF NOT EXISTS contest_collect_after_submit BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS contest_terms_url TEXT
  `);

  await client.query(`
    ALTER TABLE survey_questions
      ADD COLUMN IF NOT EXISTS max_selections INTEGER
  `);

  if (await tableExists(client, 'survey_contest_entries')) {
    await client.query(`
      ALTER TABLE survey_contest_entries
        ADD COLUMN IF NOT EXISTS age_confirmed_18 BOOLEAN NOT NULL DEFAULT false
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS survey_contest_entries_survey_email_lower
      ON survey_contest_entries (survey_id, lower(respondent_email))
    `);
  }
}

async function seedHost2026(client) {
  // Prod `surveys.closes_at` is DATE while `contest_closes_at` is TIMESTAMPTZ.
  // Reusing one bound parameter for both made Postgres fail with
  // "inconsistent types deduced for parameter $5". Cast separately.
  const surveyCopy = materializeHost2026Survey();
  const existing = await client.query(`SELECT id FROM surveys WHERE slug = $1`, [surveyCopy.slug]);
  let surveyId;
  if (existing.rows.length) {
    surveyId = existing.rows[0].id;
    await client.query(
      `UPDATE surveys SET
         title = $2,
         description = $3,
         target_tag = $4,
         status = 'active',
         closes_at = $5::timestamptz,
         thank_you_message = $6,
         thank_you_cta_text = $7,
         thank_you_cta_url = $8,
         contest_enabled = true,
         contest_prize_description = $9,
         contest_winner_count = $10::integer,
         contest_closes_at = $11::timestamptz,
         contest_collect_after_submit = true,
         contest_terms_url = $12,
         popup_logged_in_enabled = false,
         popup_landing_enabled = false,
         updated_at = NOW()
       WHERE id = $1`,
      [
        surveyId,
        surveyCopy.title,
        surveyCopy.description,
        surveyCopy.target_tag,
        HOST_2026_CLOSES_AT,
        surveyCopy.thank_you_message,
        surveyCopy.thank_you_cta_text,
        surveyCopy.thank_you_cta_url,
        surveyCopy.contest_prize_description,
        surveyCopy.contest_winner_count,
        HOST_2026_CLOSES_AT,
        surveyCopy.contest_terms_url,
      ]
    );
    const qCount = await client.query(
      `SELECT COUNT(*)::int AS n FROM survey_questions WHERE survey_id = $1`,
      [surveyId]
    );
    if (qCount.rows[0].n > 0) return;
  } else {
    const inserted = await client.query(
      `INSERT INTO surveys (
         slug, title, description, target_tag, status, closes_at,
         thank_you_message, thank_you_cta_text, thank_you_cta_url,
         contest_enabled, contest_prize_description, contest_winner_count,
         contest_closes_at, contest_collect_after_submit, contest_terms_url,
         popup_logged_in_enabled, popup_landing_enabled
       ) VALUES (
         $1,$2,$3,$4,'active',$5::timestamptz,
         $6,$7,$8,true,$9,$10::integer,
         $11::timestamptz,true,$12,false,false
       )
       RETURNING id`,
      [
        surveyCopy.slug,
        surveyCopy.title,
        surveyCopy.description,
        surveyCopy.target_tag,
        HOST_2026_CLOSES_AT,
        surveyCopy.thank_you_message,
        surveyCopy.thank_you_cta_text,
        surveyCopy.thank_you_cta_url,
        surveyCopy.contest_prize_description,
        surveyCopy.contest_winner_count,
        HOST_2026_CLOSES_AT,
        surveyCopy.contest_terms_url,
      ]
    );
    surveyId = inserted.rows[0].id;
  }

  for (let qi = 0; qi < surveyCopy.questions.length; qi++) {
    const q = surveyCopy.questions[qi];
    const qRow = await client.query(
      `INSERT INTO survey_questions
         (survey_id, sort_order, question_text, question_type, is_required, max_selections)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id`,
      [surveyId, qi, q.question_text, q.question_type, q.is_required !== false, q.max_selections ?? null]
    );
    const questionId = qRow.rows[0].id;
    if (!q.options) continue;
    for (let oi = 0; oi < q.options.length; oi++) {
      const opt = q.options[oi];
      await client.query(
        `INSERT INTO survey_options (question_id, sort_order, option_text, allows_freetext)
         VALUES ($1,$2,$3,$4)`,
        [questionId, oi, opt.option_text, opt.allows_freetext === true]
      );
    }
  }
}

module.exports = {
  name: '1810470000000_host_2026_survey',
  snapshotContract: {
    backwardCompatible: true,
    schemaOnly: true,
  },
  up: async (client) => {
    await ensureSurveyTables(client);
    await addCampaignColumns(client);
    await seedHost2026(client);
  },
  down: async (client) => {
    await client.query(`DELETE FROM surveys WHERE slug = $1`, [HOST_2026_SURVEY_SLUG]);
  },
};
