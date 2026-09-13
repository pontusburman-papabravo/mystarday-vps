'use strict';

/**
 * Public survey respondent routes (mounted at /api/surveys).
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../../../db/surveys');
const { requireAuth } = require('../../middleware/auth');
const { requireFeature } = require('../../middleware/feature-gate');
const { isPublicSurveySlugAllowed } = require('../../lib/survey-public-access');
const {
  TEXT_LONG_MAX,
  FREETEXT_MAX,
  TEXT_SHORT_MAX,
} = require('../../../config/host-2026-survey');

const publicRouter = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const surveyContestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  skip: () => process.env.RATE_LIMIT_ENABLED === 'false',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `survey-contest:${req.ip}`,
  handler: (req, res) => {
    res.status(429).json({ error: 'För många försök. Försök igen senare.' });
  },
});

function sanitizeText(value, max) {
  if (value == null) return null;
  const cleaned = String(value).replace(/\0/g, '').trim();
  if (!cleaned) return null;
  return cleaned.length > max ? cleaned.slice(0, max) : cleaned;
}

function normalizeEmail(value) {
  if (!value || typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 255 || !EMAIL_RE.test(email)) return null;
  return email;
}

async function assertSurveyPubliclyAllowed(survey) {
  if (!survey) return false;
  return isPublicSurveySlugAllowed(survey.slug);
}

// ── Del 4: Popup state endpoints ───────────────────────────────────────────

// GET /api/surveys/popup/logged-in — returns active popup survey for logged-in parent
// Returns null if no survey should be shown (dismissed, not expired snooze, etc.)
publicRouter.get('/popup/logged-in', requireAuth, requireFeature('enkater'), async (req, res) => {
  try {
    if (req.user.type !== 'parent') return res.json({ survey: null });
    const survey = await db.getActivePopupSurveyForLoggedIn();
    if (!survey) return res.json({ survey: null });

    // Check registered_before/after audience filter
    if (survey.popup_registered_after || survey.popup_registered_before) {
      // We need the parent's created_at — fetch it inline
      const rawDb = require('../../lib/db');
      const parentRes = await rawDb.query(
        `SELECT created_at FROM parent WHERE id = $1`, [req.user.id]
      );
      const parent = parentRes.rows[0];
      if (parent) {
        const pCreated = new Date(parent.created_at);
        if (survey.popup_registered_after && pCreated < new Date(survey.popup_registered_after)) {
          return res.json({ survey: null });
        }
        if (survey.popup_registered_before && pCreated > new Date(survey.popup_registered_before)) {
          return res.json({ survey: null });
        }
      }
    }

    // Check if parent already dismissed, clicked, or snooze still active.
    // 'shown' is the only action that doesn't suppress — all intentional actions do.
    const interaction = await db.getPopupInteraction(survey.id, req.user.id);
    if (interaction) {
      if (interaction.action === 'dismissed') return res.json({ survey: null });
      if (interaction.action === 'clicked') return res.json({ survey: null });
      if (interaction.action === 'snoozed' && interaction.snooze_until && new Date(interaction.snooze_until) > new Date()) {
        return res.json({ survey: null });
      }
    }

    // Check if already submitted
    const dupCheck = await db.getSurveyStats(survey.id);
    // We can't check per-parent without more joins — skip; dedup is handled client-side by cookie too

    res.json({ survey });
  } catch (err) {
    console.error('[SURVEYS] popup logged-in error:', err);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// GET /api/surveys/popup/landing — returns active popup survey for landing visitors
publicRouter.get('/popup/landing', async (req, res) => {
  try {
    const survey = await db.getActivePopupSurveyForLanding();
    if (!survey) return res.json({ survey: null });
    res.json({
      survey: {
        id: survey.id, slug: survey.slug, title: survey.title,
        description: survey.description,
        popup_trigger_delay_secs: survey.popup_trigger_delay_secs,
        popup_trigger_scroll_pct: survey.popup_trigger_scroll_pct,
        contest_enabled: survey.contest_enabled,
        contest_prize_description: survey.contest_prize_description,
      }
    });
  } catch (err) {
    console.error('[SURVEYS] popup landing error:', err);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// POST /api/surveys/popup/interaction — record popup action (shown/snoozed/dismissed/clicked)
publicRouter.post('/popup/interaction', async (req, res) => {
  try {
    const { survey_id, action, snooze_days, cookie_token } = req.body;
    if (!survey_id || !action) return res.status(400).json({ error: 'survey_id och action krävs' });

    // Logged-in parent check (optional auth)
    const parentId = req.user?.type === 'parent' ? req.user.id : null;

    await db.recordPopupInteraction({
      surveyId: survey_id,
      parentId,
      cookieToken: cookie_token || null,
      action,
      snoozeDays: snooze_days || 3,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[SURVEYS] popup interaction error:', err);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// Get survey by slug (public — returns questions + options, no responses)
publicRouter.get('/s/:slug', async (req, res) => {
  try {
    const allowed = await isPublicSurveySlugAllowed(req.params.slug);
    if (!allowed) {
      return res.status(403).json({ error: 'Enkäten är inte tillgänglig just nu' });
    }
    const survey = await db.getSurveyFullBySlug(req.params.slug);
    if (!survey) return res.status(404).json({ error: 'Enkät hittades inte' });
    if (survey.status === 'closed') return res.status(410).json({ error: 'Enkäten är stängd', status: 'closed' });
    if (survey.status === 'paused') return res.status(503).json({ error: 'Enkäten är pausad', status: 'paused' });
    if (survey.status === 'draft') return res.status(404).json({ error: 'Enkät hittades inte' });
    // Auto-close if closes_at is past
    if (survey.closes_at && new Date(survey.closes_at) < new Date()) {
      return res.status(410).json({ error: 'Enkäten har stängts', status: 'closed', closes_at: survey.closes_at });
    }
    // Track view for response-rate calculation (fire-and-forget)
    db.incrementViewCount(survey.id).catch(() => {});
    res.json(survey);
  } catch (err) {
    console.error('[SURVEYS] public get error:', err);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// Start a response session (called when respondent opens survey)
publicRouter.post('/s/:slug/start', async (req, res) => {
  try {
    const allowed = await isPublicSurveySlugAllowed(req.params.slug);
    if (!allowed) {
      return res.status(403).json({ error: 'Enkäten är inte tillgänglig just nu' });
    }
    const survey = await db.getSurveyBySlug(req.params.slug);
    if (!survey || survey.status !== 'active') {
      return res.status(404).json({ error: 'Enkät ej tillgänglig' });
    }
    if (survey.closes_at && new Date(survey.closes_at) < new Date()) {
      return res.status(410).json({ error: 'Enkäten har stängts', status: 'closed' });
    }

    const { fingerprint, cookie_token } = req.body;

    // Duplicate check
    if (cookie_token) {
      const dup = await db.checkDuplicate(survey.id, cookie_token);
      if (dup && dup.status === 'submitted') {
        return res.status(409).json({ error: 'Du har redan svarat på denna enkät', duplicate: true });
      }
    }

    const response = await db.createResponse({ survey_id: survey.id, fingerprint });
    const ipRaw = req.ip || '';
    // Minimal hash — not cryptographic, just for aggregation
    const ip_hash = Buffer.from(ipRaw).toString('base64').slice(0, 20);

    if (cookie_token) {
      await db.recordParticipant({ survey_id: survey.id, response_id: response.id, cookie_token, fingerprint, ip_hash });
    }

    res.status(201).json({ response_id: response.id, survey_id: survey.id });
  } catch (err) {
    console.error('[SURVEYS] start error:', err);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// Save answer (partial save — can be called any time during the survey)
publicRouter.post('/responses/:rid/answers', async (req, res) => {
  try {
    const { question_id, answer_text, selected_option_ids, freetext_value, scale_value } = req.body;
    if (!question_id) return res.status(400).json({ error: 'question_id krävs' });
    const response = await db.getResponse(req.params.rid);
    if (!response) return res.status(404).json({ error: 'Session hittades inte' });
    if (response.status === 'submitted') return res.status(409).json({ error: 'Enkäten är redan inskickad' });

    const survey = await db.getSurveyById(response.survey_id);
    if (!(await assertSurveyPubliclyAllowed(survey))) {
      return res.status(403).json({ error: 'Enkäten är inte tillgänglig just nu' });
    }

    const question = await db.getQuestion(question_id);
    if (!question || question.survey_id !== response.survey_id) {
      return res.status(400).json({ error: 'Ogiltig fråga' });
    }

    let optionIds = Array.isArray(selected_option_ids) ? selected_option_ids.filter(Boolean) : [];
    if (question.question_type === 'radio' && optionIds.length > 1) {
      optionIds = optionIds.slice(0, 1);
    }
    if (question.question_type === 'checkbox' && question.max_selections && optionIds.length > question.max_selections) {
      return res.status(400).json({ error: `Du kan välja högst ${question.max_selections}` });
    }
    if (optionIds.length > 0) {
      const options = await db.getOptionsForQuestion(question.id);
      const valid = new Set(options.map((o) => String(o.id)));
      if (optionIds.some((id) => !valid.has(String(id)))) {
        return res.status(400).json({ error: 'Ogiltigt svarsalternativ' });
      }
    }

    const textMax = question.question_type === 'text_long' ? TEXT_LONG_MAX : TEXT_SHORT_MAX;
    const answer = await db.upsertAnswer({
      response_id: req.params.rid,
      question_id,
      answer_text: sanitizeText(answer_text, textMax),
      selected_option_ids: optionIds,
      freetext_value: sanitizeText(freetext_value, FREETEXT_MAX),
      scale_value,
    });
    res.json(answer);
  } catch (err) {
    console.error('[SURVEYS] save answer error:', err);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// Submit response (final)
publicRouter.post('/responses/:rid/submit', async (req, res) => {
  try {
    const { gdpr_consent, respondent_email, contest_gdpr_consent } = req.body;
    const response = await db.getResponse(req.params.rid);
    if (!response) return res.status(404).json({ error: 'Session hittades inte' });
    if (response.status === 'submitted') return res.status(409).json({ error: 'Enkäten är redan inskickad' });

    const survey = await db.getSurveyById(response.survey_id);
    if (!(await assertSurveyPubliclyAllowed(survey))) {
      return res.status(403).json({ error: 'Enkäten är inte tillgänglig just nu' });
    }

    const separateContest = survey?.contest_collect_after_submit === true;
    const emailForResponse = separateContest ? null : (normalizeEmail(respondent_email) || null);
    await db.submitResponse(req.params.rid, { gdpr_consent, respondent_email: emailForResponse });

    // Legacy intro-contest surveys only. host-2026 collects email after submit.
    let contestEntered = false;
    if (!separateContest && survey?.contest_enabled && contest_gdpr_consent && emailForResponse) {
      try {
        await db.upsertContestEntry({
          surveyId: response.survey_id,
          responseId: req.params.rid,
          respondentEmail: emailForResponse,
        });
        contestEntered = true;
      } catch {
        // non-fatal — contestEntered stays false
      }
    }

    res.json({
      ok: true,
      thank_you_message: survey?.thank_you_message || 'Tack för ditt svar!',
      thank_you_cta_text: survey?.thank_you_cta_text || null,
      thank_you_cta_url: survey?.thank_you_cta_url || null,
      target_tag: survey?.target_tag || null,
      contest_enabled: survey?.contest_enabled || false,
      contest_collect_after_submit: separateContest,
      contest_terms_url: survey?.contest_terms_url || null,
      contest_entered: contestEntered,
      contest_prize_description: survey?.contest_prize_description || null,
      contest_closes_at: survey?.contest_closes_at || null,
    });
  } catch (err) {
    console.error('[SURVEYS] submit error:', err);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// Lottery opt-in after a submitted response. Email is not copied onto survey_responses.
publicRouter.post('/responses/:rid/contest', surveyContestLimiter, async (req, res) => {
  try {
    const response = await db.getResponse(req.params.rid);
    if (!response) return res.status(404).json({ error: 'Session hittades inte' });
    if (response.status !== 'submitted') {
      return res.status(409).json({ error: 'Svara på enkäten först' });
    }

    const survey = await db.getSurveyById(response.survey_id);
    if (!(await assertSurveyPubliclyAllowed(survey))) {
      return res.status(403).json({ error: 'Enkäten är inte tillgänglig just nu' });
    }
    if (!survey?.contest_enabled) {
      return res.status(400).json({ error: 'Utlottningen är inte öppen' });
    }

    const contestClose = survey.contest_closes_at || survey.closes_at;
    if (contestClose && new Date(contestClose) < new Date()) {
      return res.status(410).json({ error: 'Utlottningen är stängd' });
    }

    const { age_confirmed_18, contest_gdpr_consent } = req.body || {};
    if (age_confirmed_18 !== true) {
      return res.status(400).json({ error: 'Du måste vara 18 år eller äldre för att delta' });
    }
    if (contest_gdpr_consent !== true) {
      return res.status(400).json({ error: 'Samtycke krävs för att delta i utlottningen' });
    }

    const email = normalizeEmail(req.body.email || req.body.respondent_email);
    if (!email) {
      return res.status(400).json({ error: 'Ogiltig e-postadress' });
    }

    if (await db.getContestEntryByResponse(response.id)) {
      return res.status(409).json({ error: 'Du är redan anmäld till utlottningen' });
    }
    if (await db.getContestEntryByEmail(survey.id, email)) {
      return res.status(409).json({ error: 'Den här adressen är redan anmäld' });
    }

    try {
      await db.createSeparatedContestEntry({
        surveyId: survey.id,
        responseId: response.id,
        respondentEmail: email,
        ageConfirmed18: true,
      });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Den här adressen är redan anmäld' });
      }
      throw err;
    }

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[SURVEYS] contest entry error:', err);
    res.status(500).json({ error: 'Serverfel' });
  }
});

module.exports = publicRouter;
