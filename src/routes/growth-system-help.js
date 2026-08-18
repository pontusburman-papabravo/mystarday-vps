'use strict';

/**
 * Journey-gated in-product system help for stuck families.
 * GET  /api/growth/system-help/context
 * POST /api/growth/system-help/shown
 * POST /api/growth/system-help/engage
 * POST /api/growth/system-help/support-request
 */

const express = require('express');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const { requireParent } = require('../middleware/auth');
const {
  evaluateSystemHelp,
  recordShown,
  recordEngaged,
  recordSupportRequested,
  recordSystemHelpApiError,
  mapSystemHelpRouteError,
  SURFACES,
} = require('../lib/growth-system-help');

const router = express.Router();

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.RATE_LIMIT_ENABLED === 'false' ? 0 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `growth-system-help:${req.user?.id || req.ip}`,
  handler: (_req, res) => {
    res.status(429).json({ error: 'För många försök. Försök igen senare.' });
  },
});

const SurfaceSchema = z.enum(Object.values(SURFACES));

function invalidSessionContext() {
  return { eligible: false, reason: 'invalid_session' };
}

function invalidSessionMutation() {
  return { ok: false, reason: 'invalid_session' };
}

function sendRouteError(res, err, { familyId, route, isContext }) {
  const mapped = mapSystemHelpRouteError(err, { isContext });
  if (mapped.recordError) {
    console.error(`[GROWTH-SYSTEM-HELP] ${route} error:`, err);
    recordSystemHelpApiError(familyId, route, err);
  }
  return res.status(mapped.status).json(mapped.body);
}

router.get('/context', requireParent, limiter, async (req, res) => {
  try {
    const familyId = req.user.familyId;
    if (!familyId) {
      return res.status(401).json(invalidSessionContext());
    }
    const parsed = z.object({
      surface: SurfaceSchema.optional(),
      locale: z.string().max(16).optional(),
    }).safeParse(req.query || {});
    if (!parsed.success) {
      return res.status(400).json({ eligible: false, reason: 'invalid_query' });
    }
    const result = await evaluateSystemHelp(familyId, {
      surface: parsed.data.surface || SURFACES.help_panel,
      locale: parsed.data.locale,
    });
    if (result.reason === 'invalid_session') {
      return res.status(401).json(invalidSessionContext());
    }
    if (result.reason === 'family_not_found') {
      return res.status(404).json(result);
    }
    return res.json(result);
  } catch (err) {
    return sendRouteError(res, err, {
      familyId: req.user?.familyId,
      route: 'context',
      isContext: true,
    });
  }
});

router.post('/shown', requireParent, limiter, async (req, res) => {
  try {
    const familyId = req.user.familyId;
    if (!familyId) {
      return res.status(401).json(invalidSessionMutation());
    }
    const parsed = z.object({
      surface: SurfaceSchema.optional(),
      blocking_step: z.string().max(64).optional(),
    }).safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: 'invalid_body' });
    }

    const eligibility = await evaluateSystemHelp(familyId, {
      surface: parsed.data.surface || SURFACES.help_panel,
    });
    if (eligibility.reason === 'invalid_session') {
      return res.status(401).json(invalidSessionMutation());
    }
    if (eligibility.reason === 'family_not_found') {
      return res.status(404).json({ ok: false, reason: eligibility.reason });
    }
    if (!eligibility.eligible) {
      return res.status(403).json({ ok: false, reason: eligibility.reason });
    }
    if (
      parsed.data.blocking_step
      && parsed.data.blocking_step !== eligibility.blockingStep
    ) {
      return res.status(403).json({ ok: false, reason: 'blocking_step_mismatch' });
    }

    const row = await recordShown(familyId, { surface: parsed.data.surface });
    return res.json({ ok: Boolean(row) });
  } catch (err) {
    return sendRouteError(res, err, { familyId: req.user?.familyId, route: 'shown' });
  }
});

router.post('/engage', requireParent, limiter, async (req, res) => {
  try {
    const familyId = req.user.familyId;
    if (!familyId) {
      return res.status(401).json(invalidSessionMutation());
    }
    const parsed = z.object({
      surface: SurfaceSchema.optional(),
      blocking_step: z.string().max(64).optional(),
      cta_action: z.string().max(64).optional(),
    }).safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: 'invalid_body' });
    }

    const eligibility = await evaluateSystemHelp(familyId, {
      surface: parsed.data.surface || SURFACES.help_panel,
    });
    if (eligibility.reason === 'invalid_session') {
      return res.status(401).json(invalidSessionMutation());
    }
    if (eligibility.reason === 'family_not_found') {
      return res.status(404).json({ ok: false, reason: eligibility.reason });
    }
    if (!eligibility.eligible) {
      return res.status(403).json({ ok: false, reason: eligibility.reason });
    }

    const row = await recordEngaged(familyId, {
      surface: parsed.data.surface,
      cta_action: parsed.data.cta_action,
    });
    return res.json({ ok: Boolean(row), ctaAction: eligibility.help?.ctaAction || null });
  } catch (err) {
    return sendRouteError(res, err, { familyId: req.user?.familyId, route: 'engage' });
  }
});

router.post('/support-request', requireParent, limiter, async (req, res) => {
  try {
    const familyId = req.user.familyId;
    if (!familyId) {
      return res.status(401).json(invalidSessionMutation());
    }
    const parsed = z.object({
      surface: SurfaceSchema.optional(),
      context: z.record(z.string(), z.unknown()).optional(),
    }).safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: 'invalid_body' });
    }

    const eligibility = await evaluateSystemHelp(familyId, {
      surface: parsed.data.surface || SURFACES.help_panel,
    });
    if (eligibility.reason === 'invalid_session') {
      return res.status(401).json(invalidSessionMutation());
    }
    if (eligibility.reason === 'family_not_found') {
      return res.status(404).json({ ok: false, reason: eligibility.reason });
    }
    if (!eligibility.eligible) {
      return res.status(403).json({ ok: false, reason: eligibility.reason });
    }

    const row = await recordSupportRequested(familyId, {
      surface: parsed.data.surface,
      context: parsed.data.context,
      parentEmail: req.user.email,
      parentName: req.user.name,
    });
    return res.json({ ok: Boolean(row) });
  } catch (err) {
    return sendRouteError(res, err, {
      familyId: req.user?.familyId,
      route: 'support-request',
    });
  }
});

module.exports = router;
