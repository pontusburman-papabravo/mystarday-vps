'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const { requireParent } = require('../middleware/auth');
const familyMilestones = require('../../db/family-milestones');
const { deriveContext, getContextDerivation, getPhaseDerivation } = require('../lib/journey/evaluator');
const { ingestClientIntent } = require('../lib/journey/ingest');
const { FLAG_KEYS, isFlagEnabled, getFlagState } = require('../lib/journey/flags');

const router = express.Router();
router.use(requireParent);

const REGISTRY_PATH = path.join(__dirname, '../../config/journey-experience-registry.json');

function loadRegistry() {
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  } catch (err) {
    console.error('[journey-context] registry load failed:', err.message);
    return { version: '2026-06-28-v1', phases: {} };
  }
}

async function requireContextApi(req, res, next) {
  const enabled = await isFlagEnabled(FLAG_KEYS.contextApi);
  if (!enabled) {
    return res.status(503).json({ error: 'Family Journey API är inte aktiverat' });
  }
  next();
}

async function buildContextForFamily(familyId) {
  const evaluatorOn = await isFlagEnabled(FLAG_KEYS.evaluatorEnabled);
  const phase = await familyMilestones.getJourneyPhase(familyId);
  const milestones = await familyMilestones.getMilestoneMap(familyId);

  if (!evaluatorOn) {
    return {
      phase,
      milestones,
      recommended_experiences: [],
      blocking_experience: null,
      celebration: null,
      priority: 'none',
      reason: [],
      registry_version: loadRegistry().version,
    };
  }

  return deriveContext({ phase, milestones });
}

router.use(requireContextApi);

/**
 * GET /api/me/journey-context
 */
router.get('/journey-context', async (req, res) => {
  try {
    const familyId = req.user.familyId;
    if (!familyId) {
      return res.status(400).json({ error: 'Ingen familj kopplad' });
    }
    const context = await buildContextForFamily(familyId);
    res.json(context);
  } catch (err) {
    console.error('[journey-context] GET error:', err);
    res.status(500).json({ error: 'Något gick fel' });
  }
});

/**
 * GET /api/me/journey-debug
 */
router.get('/journey-debug', async (req, res) => {
  try {
    const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    const debugFlag = await isFlagEnabled(FLAG_KEYS.debugApi);
    if (!isDev && !debugFlag && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Ej behörig' });
    }

    const familyId = req.user.familyId;
    if (!familyId) {
      return res.status(400).json({ error: 'Ingen familj kopplad' });
    }

    const milestones = await familyMilestones.getMilestoneMap(familyId);
    const phase = await familyMilestones.getJourneyPhase(familyId);
    const context = await buildContextForFamily(familyId);
    const flags = await getFlagState();

    res.json({
      phase: context.phase,
      phase_derivation: getPhaseDerivation(milestones),
      context_derivation: getContextDerivation(context),
      milestones_raw: await familyMilestones.listRaw(familyId),
      flags: {
        context_api: flags.contextApi,
        ingest_enabled: flags.ingestEnabled,
        evaluator_enabled: flags.evaluatorEnabled,
        debug_api: flags.debugApi,
      },
      stored_phase: phase,
    });
  } catch (err) {
    console.error('[journey-context] debug error:', err);
    res.status(500).json({ error: 'Något gick fel' });
  }
});

/**
 * POST /api/me/journey-context/events
 * Body: { intent: 'handoff_started' | 'handoff_deferred' | 'celebration_dismissed', child_id? }
 */
router.post('/journey-context/events', async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const { intent, child_id: childId } = req.body || {};

    if (!familyId || !intent) {
      return res.status(400).json({ error: 'intent krävs' });
    }

    const result = await ingestClientIntent({
      familyId,
      intent,
      childId: childId || null,
    });

    if (!result.ok) {
      const status = result.error === 'invalid_phase' ? 409 : 400;
      return res.status(status).json({ error: result.error || 'Kunde inte registrera händelse' });
    }

    const context = await buildContextForFamily(familyId);
    res.json({ ok: true, context });
  } catch (err) {
    console.error('[journey-context] events error:', err);
    res.status(500).json({ error: 'Något gick fel' });
  }
});

/**
 * GET /api/me/journey-context/registry
 */
router.get('/journey-context/registry', (_req, res) => {
  res.json(loadRegistry());
});

module.exports = router;
