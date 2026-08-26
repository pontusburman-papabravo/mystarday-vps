'use strict';

/**
 * Admin — manual stuck-family intervention preview/send/skip (V1).
 * Does NOT require growth_stuck_cohorts_v1. No automation.
 */

const express = require('express');
const { z } = require('zod');
const {
  previewStuckIntervention,
  sendStuckIntervention,
  skipStuckIntervention,
} = require('../../lib/growth-stuck-intervention');

const router = express.Router();

const FamilyIdSchema = z.string().uuid();

function adminParentId(req) {
  return req.user?.id || null;
}

router.get('/growth/stuck-cohorts/:familyId/intervention/preview', async (req, res) => {
  try {
    const parsed = FamilyIdSchema.safeParse(req.params.familyId);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Ogiltigt familyId' });
    }
    const result = await previewStuckIntervention(parsed.data, { track: true });
    if (result.blockers.some((b) => b.code === 'family_not_found')) {
      return res.status(404).json({ error: 'Familjen hittades inte' });
    }
    return res.json({
      eligible: result.eligible,
      blockers: result.blockers,
      cohort: result.cohort,
      interventionKey: result.interventionKey,
      family: result.family,
      emailPreview: result.emailPreview,
      commsHistory: result.commsHistory,
      manualOnly: true,
    });
  } catch (err) {
    console.error('[ADMIN growth-stuck-intervention] preview error:', err);
    return res.status(500).json({ error: 'Kunde inte förhandsgranska', detail: err.message });
  }
});

router.post('/growth/stuck-cohorts/:familyId/intervention/send', async (req, res) => {
  try {
    const parsed = FamilyIdSchema.safeParse(req.params.familyId);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Ogiltigt familyId' });
    }
    const result = await sendStuckIntervention(parsed.data, adminParentId(req));
    if (result.blockers?.some((b) => b.code === 'family_not_found')) {
      return res.status(404).json({ error: 'Familjen hittades inte' });
    }
    if (!result.ok) {
      return res.status(409).json({
        ok: false,
        eligible: result.eligible,
        blockers: result.blockers,
        commsHistory: result.commsHistory,
      });
    }
    return res.json({
      ok: true,
      interventionId: result.interventionId,
      sentAt: result.sentAt,
      cohort: result.cohort,
      interventionKey: result.interventionKey,
      subject: result.subject,
      commsHistory: result.commsHistory,
    });
  } catch (err) {
    console.error('[ADMIN growth-stuck-intervention] send error:', err);
    return res.status(500).json({ error: 'Kunde inte skicka', detail: err.message });
  }
});

router.post('/growth/stuck-cohorts/:familyId/intervention/skip', async (req, res) => {
  try {
    const parsedId = FamilyIdSchema.safeParse(req.params.familyId);
    if (!parsedId.success) {
      return res.status(400).json({ error: 'Ogiltigt familyId' });
    }
    const parsedBody = z.object({
      reason: z.string().max(500).optional(),
    }).safeParse(req.body || {});
    if (!parsedBody.success) {
      return res.status(400).json({ error: 'Ogiltig body' });
    }
    const result = await skipStuckIntervention(
      parsedId.data,
      adminParentId(req),
      parsedBody.data.reason
    );
    return res.json({
      ok: result.ok,
      skipped: result.skipped,
      evaluation: {
        cohort: result.evaluation.cohort,
        interventionKey: result.evaluation.interventionKey,
      },
    });
  } catch (err) {
    console.error('[ADMIN growth-stuck-intervention] skip error:', err);
    return res.status(500).json({ error: 'Kunde inte hoppa över', detail: err.message });
  }
});

module.exports = router;
