/**
 * db/surveys.js
 * Owns: surveys, survey_questions, survey_options, survey_responses,
 *       survey_response_answers, survey_participants tables.
 * Does NOT own: authentication, family/child tables, push notifications.
 */

const db = require('../src/lib/db');

// ── Survey CRUD ────────────────────────────────────────────────────────────

async function createSurvey({ slug, title, description, target_tag, opens_at, closes_at, thank_you_message, thank_you_cta_text, thank_you_cta_url }) {
  const result = await db.query(
    `INSERT INTO surveys (slug, title, description, target_tag, opens_at, closes_at, thank_you_message, thank_you_cta_text, thank_you_cta_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [slug, title, description, target_tag, opens_at, closes_at, thank_you_message, thank_you_cta_text, thank_you_cta_url]
  );
  return result.rows[0];
}

async function getSurveyById(id) {
  const result = await db.query(`SELECT * FROM surveys WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

async function getSurveyBySlug(slug) {
  const result = await db.query(`SELECT * FROM surveys WHERE slug = $1`, [slug]);
  return result.rows[0] || null;
}

async function getAllSurveys() {
  const result = await db.query(
    `SELECT * FROM surveys ORDER BY created_at DESC`
  );
  return result.rows;
}

async function updateSurvey(id, fields) {
  const allowed = [
    'slug', 'title', 'description', 'target_tag', 'status', 'opens_at', 'closes_at',
    'thank_you_message', 'thank_you_cta_text', 'thank_you_cta_url',
    // Del 4: popup + contest config
    'popup_logged_in_enabled', 'popup_landing_enabled',
    'popup_trigger_delay_secs', 'popup_trigger_scroll_pct',
    'popup_start_date', 'popup_end_date',
    'popup_registered_after', 'popup_registered_before',
    'contest_enabled', 'contest_prize_description', 'contest_prize_image_url',
    'contest_winner_count', 'contest_closes_at',
  ];
  const sets = [];
  const vals = [];
  let idx = 1;
  for (const key of allowed) {
    if (key in fields) {
      sets.push(`${key} = $${idx++}`);
      vals.push(fields[key]);
    }
  }
  if (sets.length === 0) return null;
  sets.push(`updated_at = NOW()`);
  vals.push(id);
  const result = await db.query(
    `UPDATE surveys SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    vals
  );
  return result.rows[0] || null;
}

async function deleteSurvey(id) {
  await db.query(`DELETE FROM surveys WHERE id = $1`, [id]);
}

// ── Questions ──────────────────────────────────────────────────────────────

async function getQuestionsForSurvey(surveyId) {
  const result = await db.query(
    `SELECT * FROM survey_questions WHERE survey_id = $1 ORDER BY sort_order ASC`,
    [surveyId]
  );
  return result.rows;
}

async function createQuestion({ survey_id, sort_order, question_text, question_type, scale_min, scale_max, scale_min_label, scale_max_label, is_required, condition_question_id, condition_option_id }) {
  const result = await db.query(
    `INSERT INTO survey_questions
       (survey_id, sort_order, question_text, question_type, scale_min, scale_max, scale_min_label, scale_max_label, is_required, condition_question_id, condition_option_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [survey_id, sort_order ?? 0, question_text, question_type, scale_min ?? null, scale_max ?? null, scale_min_label ?? null, scale_max_label ?? null, is_required ?? true, condition_question_id ?? null, condition_option_id ?? null]
  );
  return result.rows[0];
}

async function updateQuestion(id, fields) {
  const allowed = ['sort_order', 'question_text', 'question_type', 'scale_min', 'scale_max', 'scale_min_label', 'scale_max_label', 'is_required', 'condition_question_id', 'condition_option_id'];
  const sets = [];
  const vals = [];
  let idx = 1;
  for (const key of allowed) {
    if (key in fields) {
      sets.push(`${key} = $${idx++}`);
      vals.push(fields[key]);
    }
  }
  if (sets.length === 0) return null;
  vals.push(id);
  const result = await db.query(
    `UPDATE survey_questions SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    vals
  );
  return result.rows[0] || null;
}

async function deleteQuestion(id) {
  await db.query(`DELETE FROM survey_questions WHERE id = $1`, [id]);
}

async function reorderQuestions(surveyId, orderedIds) {
  // orderedIds: array of question UUIDs in desired order
  for (let i = 0; i < orderedIds.length; i++) {
    await db.query(
      `UPDATE survey_questions SET sort_order = $1 WHERE id = $2 AND survey_id = $3`,
      [i, orderedIds[i], surveyId]
    );
  }
}

// ── Options ────────────────────────────────────────────────────────────────

async function getOptionsForQuestion(questionId) {
  const result = await db.query(
    `SELECT * FROM survey_options WHERE question_id = $1 ORDER BY sort_order ASC`,
    [questionId]
  );
  return result.rows;
}

async function getOptionsForQuestions(questionIds) {
  if (questionIds.length === 0) return [];
  const result = await db.query(
    `SELECT * FROM survey_options WHERE question_id = ANY($1) ORDER BY sort_order ASC`,
    [questionIds]
  );
  return result.rows;
}

async function createOption({ question_id, sort_order, option_text, allows_freetext }) {
  const result = await db.query(
    `INSERT INTO survey_options (question_id, sort_order, option_text, allows_freetext)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [question_id, sort_order ?? 0, option_text, allows_freetext ?? false]
  );
  return result.rows[0];
}

async function updateOption(id, fields) {
  const allowed = ['sort_order', 'option_text', 'allows_freetext'];
  const sets = [];
  const vals = [];
  let idx = 1;
  for (const key of allowed) {
    if (key in fields) {
      sets.push(`${key} = $${idx++}`);
      vals.push(fields[key]);
    }
  }
  if (sets.length === 0) return null;
  vals.push(id);
  const result = await db.query(
    `UPDATE survey_options SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    vals
  );
  return result.rows[0] || null;
}

async function deleteOption(id) {
  await db.query(`DELETE FROM survey_options WHERE id = $1`, [id]);
}

// ── Full survey with questions + options (for rendering/editing) ──────────

async function getSurveyFull(surveyId) {
  const survey = await getSurveyById(surveyId);
  if (!survey) return null;
  const questions = await getQuestionsForSurvey(surveyId);
  const questionIds = questions.map(q => q.id);
  const options = await getOptionsForQuestions(questionIds);

  // Group options by question
  const optionsByQuestion = {};
  for (const opt of options) {
    if (!optionsByQuestion[opt.question_id]) optionsByQuestion[opt.question_id] = [];
    optionsByQuestion[opt.question_id].push(opt);
  }

  survey.questions = questions.map(q => ({
    ...q,
    options: optionsByQuestion[q.id] || [],
  }));
  return survey;
}

async function getSurveyFullBySlug(slug) {
  const survey = await getSurveyBySlug(slug);
  if (!survey) return null;
  return getSurveyFull(survey.id);
}

// ── Responses ──────────────────────────────────────────────────────────────

async function createResponse({ survey_id, fingerprint }) {
  const result = await db.query(
    `INSERT INTO survey_responses (survey_id, fingerprint)
     VALUES ($1, $2) RETURNING *`,
    [survey_id, fingerprint ?? null]
  );
  return result.rows[0];
}

async function getResponse(id) {
  const result = await db.query(`SELECT * FROM survey_responses WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

async function submitResponse(id, { gdpr_consent, respondent_email, campaign_ref }) {
  const result = await db.query(
    `UPDATE survey_responses
     SET status = 'submitted', submitted_at = NOW(), gdpr_consent = $2, respondent_email = $3,
         campaign_ref = COALESCE($4, campaign_ref), updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, gdpr_consent ?? false, respondent_email ?? null, campaign_ref ?? null]
  );
  return result.rows[0] || null;
}

async function upsertAnswer({ response_id, question_id, answer_text, selected_option_ids, freetext_value, scale_value }) {
  const result = await db.query(
    `INSERT INTO survey_response_answers (response_id, question_id, answer_text, selected_option_ids, freetext_value, scale_value)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (response_id, question_id) DO UPDATE SET
       answer_text = EXCLUDED.answer_text,
       selected_option_ids = EXCLUDED.selected_option_ids,
       freetext_value = EXCLUDED.freetext_value,
       scale_value = EXCLUDED.scale_value,
       updated_at = NOW()
     RETURNING *`,
    [response_id, question_id, answer_text ?? null, selected_option_ids ?? [], freetext_value ?? null, scale_value ?? null]
  );
  return result.rows[0];
}

async function getAnswersForResponse(response_id) {
  const result = await db.query(
    `SELECT * FROM survey_response_answers WHERE response_id = $1`,
    [response_id]
  );
  return result.rows;
}

// ── Duplicate detection ────────────────────────────────────────────────────

async function checkDuplicate(survey_id, cookie_token) {
  const result = await db.query(
    `SELECT sp.id, sr.status FROM survey_participants sp
     JOIN survey_responses sr ON sr.id = sp.response_id
     WHERE sp.survey_id = $1 AND sp.cookie_token = $2
     LIMIT 1`,
    [survey_id, cookie_token]
  );
  return result.rows[0] || null;
}

async function recordParticipant({ survey_id, response_id, cookie_token, fingerprint, ip_hash }) {
  const result = await db.query(
    `INSERT INTO survey_participants (survey_id, response_id, cookie_token, fingerprint, ip_hash)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [survey_id, response_id, cookie_token, fingerprint ?? null, ip_hash ?? null]
  );
  return result.rows[0];
}

// ── Admin analytics ────────────────────────────────────────────────────────

async function getSurveyStats(surveyId) {
  const result = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'submitted') AS submitted_count,
       COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_count,
       COUNT(*) AS total_starts
     FROM survey_responses WHERE survey_id = $1`,
    [surveyId]
  );
  return result.rows[0];
}

async function getSurveyResponses(surveyId) {
  const result = await db.query(
    `SELECT sr.*, json_agg(sra ORDER BY sra.created_at) AS answers
     FROM survey_responses sr
     LEFT JOIN survey_response_answers sra ON sra.response_id = sr.id
     WHERE sr.survey_id = $1 AND sr.status = 'submitted'
     GROUP BY sr.id
     ORDER BY sr.submitted_at DESC`,
    [surveyId]
  );
  return result.rows;
}

// ── Del 2: Rapport / analytics queries ────────────────────────────────────

/**
 * Per-question answer breakdown for radio/checkbox (option counts) and scale (value distribution).
 * Returns: array of { question_id, question_type, question_text, breakdown }
 * breakdown for radio/checkbox: [{ option_id, option_text, count }]
 * breakdown for scale: [{ scale_value, count }]
 * breakdown for text: [{ answer_text }] (most recent 200)
 */
async function getSurveyQuestionBreakdowns(surveyId) {
  // Get questions + options
  const questions = await getQuestionsForSurvey(surveyId);
  if (questions.length === 0) return [];
  const questionIds = questions.map(q => q.id);
  const options = await getOptionsForQuestions(questionIds);
  const optMap = {};
  for (const o of options) {
    if (!optMap[o.question_id]) optMap[o.question_id] = [];
    optMap[o.question_id].push(o);
  }

  // Only submitted responses
  const breakdowns = [];
  for (const q of questions) {
    if (q.question_type === 'radio' || q.question_type === 'checkbox') {
      // unnest selected_option_ids and count
      const res = await db.query(
        `SELECT opt_id::text, COUNT(*)::int AS count
         FROM survey_response_answers sra
         JOIN survey_responses sr ON sr.id = sra.response_id
         CROSS JOIN LATERAL unnest(sra.selected_option_ids) AS opt_id
         WHERE sra.question_id = $1 AND sr.status = 'submitted' AND sr.survey_id = $2
         GROUP BY opt_id`,
        [q.id, surveyId]
      );
      const countMap = {};
      for (const row of res.rows) countMap[row.opt_id] = row.count;
      const optList = (optMap[q.id] || []).map(o => ({
        option_id: o.id,
        option_text: o.option_text,
        count: countMap[o.id] || 0,
      }));
      // total for percentage
      const total = optList.reduce((s, o) => s + o.count, 0);
      breakdowns.push({ question_id: q.id, question_type: q.question_type, question_text: q.question_text, total, breakdown: optList });
    } else if (q.question_type === 'scale') {
      const res = await db.query(
        `SELECT sra.scale_value, COUNT(*)::int AS count
         FROM survey_response_answers sra
         JOIN survey_responses sr ON sr.id = sra.response_id
         WHERE sra.question_id = $1 AND sr.status = 'submitted' AND sr.survey_id = $2
           AND sra.scale_value IS NOT NULL
         GROUP BY sra.scale_value ORDER BY sra.scale_value`,
        [q.id, surveyId]
      );
      const total = res.rows.reduce((s, r) => s + r.count, 0);
      const avg = total > 0 ? res.rows.reduce((s, r) => s + r.scale_value * r.count, 0) / total : null;
      breakdowns.push({ question_id: q.id, question_type: q.question_type, question_text: q.question_text, total, avg: avg ? Math.round(avg * 10) / 10 : null, scale_min: q.scale_min, scale_max: q.scale_max, scale_min_label: q.scale_min_label, scale_max_label: q.scale_max_label, breakdown: res.rows });
    } else {
      // text_short / text_long
      const res = await db.query(
        `SELECT sra.answer_text
         FROM survey_response_answers sra
         JOIN survey_responses sr ON sr.id = sra.response_id
         WHERE sra.question_id = $1 AND sr.status = 'submitted' AND sr.survey_id = $2
           AND sra.answer_text IS NOT NULL AND sra.answer_text <> ''
         ORDER BY sra.created_at DESC LIMIT 200`,
        [q.id, surveyId]
      );
      breakdowns.push({ question_id: q.id, question_type: q.question_type, question_text: q.question_text, total: res.rows.length, breakdown: res.rows.map(r => r.answer_text) });
    }
  }
  return breakdowns;
}

/**
 * Daily response counts (submitted) since survey creation, last 90 days max.
 * Returns: [{ date: 'YYYY-MM-DD', count: N }]
 */
async function getSurveyTimeSeries(surveyId) {
  const res = await db.query(
    `SELECT DATE(submitted_at) AS date, COUNT(*)::int AS count
     FROM survey_responses
     WHERE survey_id = $1 AND status = 'submitted'
       AND submitted_at >= NOW() - INTERVAL '90 days'
     GROUP BY DATE(submitted_at)
     ORDER BY date ASC`,
    [surveyId]
  );
  return res.rows;
}

/**
 * Export all submitted responses for a survey with full answer details.
 * Optional filters: start_date, end_date, complete_only.
 * Returns flat rows suitable for CSV.
 */
async function getSurveyExportRows(surveyId, { start_date, end_date, complete_only } = {}) {
  const conditions = [`sr.survey_id = $1`];
  const vals = [surveyId];
  let i = 2;

  if (complete_only) {
    conditions.push(`sr.status = 'submitted'`);
  } else {
    conditions.push(`sr.status IN ('submitted','in_progress')`);
  }
  if (start_date) { conditions.push(`sr.submitted_at >= $${i++}`); vals.push(start_date); }
  if (end_date) { conditions.push(`sr.submitted_at <= $${i++}`); vals.push(end_date); }

  const res = await db.query(
    `SELECT sr.id AS response_id, sr.status, sr.submitted_at, sr.gdpr_consent,
            json_agg(
              json_build_object(
                'question_id', sra.question_id,
                'answer_text', sra.answer_text,
                'selected_option_ids', sra.selected_option_ids,
                'freetext_value', sra.freetext_value,
                'scale_value', sra.scale_value
              ) ORDER BY sra.created_at
            ) FILTER (WHERE sra.id IS NOT NULL) AS answers
     FROM survey_responses sr
     LEFT JOIN survey_response_answers sra ON sra.response_id = sr.id
     WHERE ${conditions.join(' AND ')}
     GROUP BY sr.id
     ORDER BY sr.submitted_at DESC NULLS LAST`,
    vals
  );
  return res.rows;
}

/**
 * Multi-survey comparison: for each survey, return submitted_count + per-question breakdown.
 * surveyIds: array of UUIDs
 */
async function getComparisonData(surveyIds) {
  if (!surveyIds || surveyIds.length === 0) return [];
  const results = [];
  for (const sid of surveyIds) {
    const survey = await getSurveyById(sid);
    if (!survey) continue;
    const stats = await getSurveyStats(sid);
    const breakdowns = await getSurveyQuestionBreakdowns(sid);
    results.push({ survey_id: sid, title: survey.title, target_tag: survey.target_tag, stats, breakdowns });
  }
  return results;
}

/**
 * Increment view count for a survey (called on /tyck/:slug page load).
 */
async function incrementViewCount(surveyId) {
  await db.query(
    `UPDATE surveys SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1`,
    [surveyId]
  );
}

// ── Del 4: Popup interactions ───────────────────────────────────────────────

/**
 * Get the latest popup interaction for a parent + survey combo.
 * Returns null if no interaction recorded.
 */
async function getPopupInteraction(surveyId, parentId) {
  const res = await db.query(
    `SELECT * FROM survey_popup_interactions
     WHERE survey_id = $1 AND parent_id = $2
     ORDER BY created_at DESC LIMIT 1`,
    [surveyId, parentId]
  );
  return res.rows[0] || null;
}

async function getAnonymousPopupInteraction(surveyId, cookieToken) {
  const res = await db.query(
    `SELECT * FROM survey_popup_interactions
     WHERE survey_id = $1 AND cookie_token = $2
     ORDER BY created_at DESC LIMIT 1`,
    [surveyId, cookieToken]
  );
  return res.rows[0] || null;
}

async function recordPopupInteraction({ surveyId, parentId, cookieToken, action, snoozeDays }) {
  const snoozeUntil = (action === 'snoozed' && snoozeDays)
    ? new Date(Date.now() + snoozeDays * 86400 * 1000).toISOString()
    : null;
  // Increment impression counter atomically when showing popup
  if (action === 'shown') {
    await db.query(
      `UPDATE surveys SET popup_impression_count = popup_impression_count + 1 WHERE id = $1`,
      [surveyId]
    );
  }
  const res = await db.query(
    `INSERT INTO survey_popup_interactions (survey_id, parent_id, cookie_token, action, snooze_until)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [surveyId, parentId || null, cookieToken || null, action, snoozeUntil]
  );
  return res.rows[0];
}

/**
 * Get the active popup survey for logged-in users.
 * Returns at most one — the most recently created one with popup_logged_in_enabled.
 * Checks schedule dates.
 */
async function getActivePopupSurveyForLoggedIn() {
  const now = new Date().toISOString();
  const res = await db.query(
    `SELECT * FROM surveys
     WHERE status = 'active'
       AND popup_logged_in_enabled = true
       AND (popup_start_date IS NULL OR popup_start_date <= $1)
       AND (popup_end_date IS NULL OR popup_end_date >= $1)
     ORDER BY created_at DESC
     LIMIT 1`,
    [now]
  );
  return res.rows[0] || null;
}

/**
 * Get the active popup survey for landing page visitors.
 */
async function getActivePopupSurveyForLanding() {
  const now = new Date().toISOString();
  const res = await db.query(
    `SELECT * FROM surveys
     WHERE status = 'active'
       AND popup_landing_enabled = true
       AND (popup_start_date IS NULL OR popup_start_date <= $1)
       AND (popup_end_date IS NULL OR popup_end_date >= $1)
     ORDER BY created_at DESC
     LIMIT 1`,
    [now]
  );
  return res.rows[0] || null;
}

/**
 * Get popup impression stats for a survey (impression count + response count).
 */
async function getPopupStats(surveyId) {
  const res = await db.query(
    `SELECT
       s.popup_impression_count AS impressions,
       COUNT(sr.*) FILTER (WHERE sr.status = 'submitted') AS responses,
       COUNT(spi.*) FILTER (WHERE spi.action = 'dismissed') AS dismissed_count,
       COUNT(spi.*) FILTER (WHERE spi.action = 'snoozed') AS snoozed_count
     FROM surveys s
     LEFT JOIN survey_responses sr ON sr.survey_id = s.id
     LEFT JOIN survey_popup_interactions spi ON spi.survey_id = s.id
     WHERE s.id = $1
     GROUP BY s.id, s.popup_impression_count`,
    [surveyId]
  );
  return res.rows[0] || { impressions: 0, responses: 0, dismissed_count: 0, snoozed_count: 0 };
}

// ── Del 4: Contest entries ──────────────────────────────────────────────────

/**
 * Upsert a contest entry for a response (called on submit when contest_gdpr checked).
 * Idempotent — response_id has unique constraint.
 */
async function upsertContestEntry({ surveyId, responseId, respondentEmail }) {
  const res = await db.query(
    `INSERT INTO survey_contest_entries (survey_id, response_id, respondent_email)
     VALUES ($1, $2, $3)
     ON CONFLICT (response_id) DO UPDATE SET respondent_email = EXCLUDED.respondent_email
     RETURNING *`,
    [surveyId, responseId, respondentEmail]
  );
  return res.rows[0];
}

async function getContestEntries(surveyId) {
  const res = await db.query(
    `SELECT sce.*, sr.submitted_at
     FROM survey_contest_entries sce
     JOIN survey_responses sr ON sr.id = sce.response_id
     WHERE sce.survey_id = $1
     ORDER BY sce.created_at DESC`,
    [surveyId]
  );
  return res.rows;
}

async function pickContestWinners(surveyId, count) {
  // Reset existing winners first, then randomly pick new ones
  await db.query(`UPDATE survey_contest_entries SET is_winner = false WHERE survey_id = $1`, [surveyId]);
  const res = await db.query(
    `UPDATE survey_contest_entries SET is_winner = true
     WHERE id IN (
       SELECT id FROM survey_contest_entries
       WHERE survey_id = $1
       ORDER BY RANDOM() LIMIT $2
     )
     RETURNING *`,
    [surveyId, count]
  );
  return res.rows;
}

async function markContestEntryContacted(entryId) {
  const res = await db.query(
    `UPDATE survey_contest_entries SET is_contacted = true WHERE id = $1 RETURNING *`,
    [entryId]
  );
  return res.rows[0] || null;
}

module.exports = {
  createSurvey, getSurveyById, getSurveyBySlug, getAllSurveys, updateSurvey, deleteSurvey,
  getQuestionsForSurvey, createQuestion, updateQuestion, deleteQuestion, reorderQuestions,
  getOptionsForQuestion, getOptionsForQuestions, createOption, updateOption, deleteOption,
  getSurveyFull, getSurveyFullBySlug,
  createResponse, getResponse, submitResponse, upsertAnswer, getAnswersForResponse,
  checkDuplicate, recordParticipant,
  getSurveyStats, getSurveyResponses,
  // Del 2
  getSurveyQuestionBreakdowns, getSurveyTimeSeries, getSurveyExportRows, getComparisonData, incrementViewCount,
  // Del 4
  getPopupInteraction, getAnonymousPopupInteraction, recordPopupInteraction,
  getActivePopupSurveyForLoggedIn, getActivePopupSurveyForLanding, getPopupStats,
  upsertContestEntry, getContestEntries, pickContestWinners, markContestEntryContacted,
};
