'use strict';

/**
 * Public survey respondent routes (mounted at /api/surveys).
 */

const express = require('express');
const db = require('../../../db/surveys');
const { requireAuth } = require('../../middleware/auth');
const { requireFeature } = require('../../middleware/feature-gate');

const publicRouter = express.Router();

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
    // Gate: enkater must be globally available
    const { hasAccess: hasAccessSlug } = require('../../../db/features');
    const allowed = await hasAccessSlug(null, 'enkater');
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
    // Gate: enkater must be globally available for anonymous survey participation
    const { hasAccess } = require('../../../db/features');
    const allowed = await hasAccess(null, 'enkater');
    if (!allowed) {
      return res.status(403).json({ error: 'Enkäten är inte tillgänglig just nu' });
    }
    const { question_id, answer_text, selected_option_ids, freetext_value, scale_value } = req.body;
    if (!question_id) return res.status(400).json({ error: 'question_id krävs' });
    const response = await db.getResponse(req.params.rid);
    if (!response) return res.status(404).json({ error: 'Session hittades inte' });
    if (response.status === 'submitted') return res.status(409).json({ error: 'Enkäten är redan inskickad' });
    const answer = await db.upsertAnswer({ response_id: req.params.rid, question_id, answer_text, selected_option_ids, freetext_value, scale_value });
    res.json(answer);
  } catch (err) {
    console.error('[SURVEYS] save answer error:', err);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// Submit response (final)
publicRouter.post('/responses/:rid/submit', async (req, res) => {
  try {
    // Gate: enkater must be globally available
    const { hasAccess: hasAccessCheck } = require('../../../db/features');
    const allowed = await hasAccessCheck(null, 'enkater');
    if (!allowed) {
      return res.status(403).json({ error: 'Enkäten är inte tillgänglig just nu' });
    }
    const { gdpr_consent, respondent_email, contest_gdpr_consent, campaign_ref } = req.body;
    const response = await db.getResponse(req.params.rid);
    if (!response) return res.status(404).json({ error: 'Session hittades inte' });
    if (response.status === 'submitted') return res.status(409).json({ error: 'Enkäten är redan inskickad' });
    const submitted = await db.submitResponse(req.params.rid, {
      gdpr_consent,
      respondent_email,
      campaign_ref: campaign_ref || null,
    });

    // Get survey for thank-you config + contest
    const survey = await db.getSurveyById(response.survey_id);

    // För dig follow-up: sync PU1 → for_dig_goal_feedback outcome rows
    try {
      const { syncSurveyResponseToForDigOutcomes } = require('../../lib/for-dig-survey-outcome-runner');
      const syncResult = await syncSurveyResponseToForDigOutcomes({
        responseId: req.params.rid,
        campaignRef: campaign_ref || null,
      });
      if (syncResult.synced > 0) {
        console.log('[SURVEYS] for-dig outcome sync:', syncResult);
      }
    } catch (syncErr) {
      console.error('[SURVEYS] for-dig outcome sync error:', syncErr.message);
    }

    // Del 4: record contest entry if contest is enabled and respondent consented with email
    let contestEntered = false;
    if (survey?.contest_enabled && contest_gdpr_consent && respondent_email) {
      try {
        await db.upsertContestEntry({
          surveyId: response.survey_id,
          responseId: req.params.rid,
          respondentEmail: respondent_email,
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
      // Del 4: contest + target-tag info for custom thank-you pages
      target_tag: survey?.target_tag || null,
      contest_enabled: survey?.contest_enabled || false,
      contest_entered: contestEntered,
      contest_prize_description: survey?.contest_prize_description || null,
      contest_closes_at: survey?.contest_closes_at || null,
    });
  } catch (err) {
    console.error('[SURVEYS] submit error:', err);
    res.status(500).json({ error: 'Serverfel' });
  }
});


module.exports = publicRouter;
