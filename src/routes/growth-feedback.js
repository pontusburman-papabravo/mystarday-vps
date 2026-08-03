'use strict';

/**
 * Journey-gated growth feedback API.
 * GET  /api/growth/feedback/eligible
 * POST /api/growth/feedback
 */

const express = require('express');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const { requireParent } = require('../middleware/auth');
const { evaluateGrowthFeedbackEligibility } = require('../lib/growth-feedback-eligibility');
const feedbackDb = require('../../db/growth-feedback');
const analytics = require('../../db/analytics');

const router = express.Router();

const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.RATE_LIMIT_ENABLED === 'false' ? 0 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `growth-feedback:${req.user?.id || req.ip}`,
  handler: (_req, res) => {
    res.status(429).json({ error: 'För många försök. Försök igen senare.' });
  },
});

const SubmitSchema = z.object({
  prompt_key: z.enum([
    'first_value',
    'three_routine_days',
    'stuck_blocker',
    'onboarding_no_child_access',
    'account_delete',
  ]),
  answer: z.string().min(1).max(64),
  comment: z.string().max(500).optional().nullable(),
  locale: z.enum(['sv-SE', 'en-GB', 'sv', 'en']).optional(),
  platform: z.enum(['web', 'pwa', 'ios', 'android']).optional(),
  context: z.record(z.unknown()).optional(),
});

router.get('/eligible', requireParent, feedbackLimiter, async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const locale = req.query.locale || 'sv-SE';
    const intent = req.query.intent || undefined;
    const result = await evaluateGrowthFeedbackEligibility(familyId, { locale, intent });
    // Do not track "shown" here — client fires once after render (avoids poll spam).
    res.json(result);
  } catch (err) {
    console.error('[GROWTH-FEEDBACK] eligible error:', err);
    res.status(500).json({ eligible: false, reason: 'error' });
  }
});

router.post('/', requireParent, feedbackLimiter, async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const parsed = SubmitSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Ogiltig feedback', details: parsed.error.flatten() });
    }
    const body = parsed.data;

    // Re-check eligibility. account_delete is intent-driven but still flag-gated.
    const eligibility = await evaluateGrowthFeedbackEligibility(familyId, {
      locale: body.locale,
      intent: body.prompt_key === 'account_delete' ? 'account_delete' : undefined,
    });
    if (!eligibility.eligible) {
      return res.status(403).json({
        error: 'Feedback inte tillgänglig just nu',
        reason: eligibility.reason,
      });
    }
    if (
      eligibility.prompt &&
      eligibility.prompt.promptKey !== body.prompt_key
    ) {
      return res.status(403).json({
        error: 'Fel prompt för nuvarande journey-läge',
        reason: 'prompt_mismatch',
      });
    }

    const allowedAnswers = new Set(
      (eligibility.prompt?.answers || []).map((a) => a.value)
    );
    if (allowedAnswers.size > 0 && !allowedAnswers.has(body.answer)) {
      return res.status(400).json({ error: 'Ogiltigt svar' });
    }

    const row = await feedbackDb.insertFeedback({
      familyId,
      promptKey: body.prompt_key,
      answer: body.answer,
      comment: body.comment ? String(body.comment).trim().slice(0, 500) : null,
      context: sanitizeContext(body.context),
      locale: body.locale || null,
      platform: body.platform || null,
    });

    analytics.track(familyId, 'growth_feedback_submitted', {
      prompt_key: body.prompt_key,
      answer: body.answer,
      has_comment: Boolean(body.comment),
    }).catch(() => {});

    res.json({ ok: true, stored: Boolean(row), duplicate: !row });
  } catch (err) {
    console.error('[GROWTH-FEEDBACK] submit error:', err);
    res.status(500).json({ error: 'Kunde inte spara feedback' });
  }
});

function sanitizeContext(ctx) {
  if (!ctx || typeof ctx !== 'object') return {};
  const out = {};
  const keys = ['blocking_step', 'surface', 'trigger'];
  for (const key of keys) {
    if (typeof ctx[key] === 'string' && ctx[key].length <= 64) {
      out[key] = ctx[key];
    }
  }
  return out;
}

module.exports = router;
