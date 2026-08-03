'use strict';

/**
 * Admin — growth stuck cohorts (preview segments, no auto-send).
 * GET /api/admin/growth/stuck-cohorts
 * GET /api/admin/growth/stuck-cohorts/summary
 */

const express = require('express');
const {
  listGrowthStuckCohorts,
  summarizeGrowthStuckCohorts,
  COHORTS,
} = require('../../../db/growth-stuck-cohorts');
const { isActivationFlagEnabled } = require('../../lib/activation-flags');

const router = express.Router();

async function requireFlag(_req, res, next) {
  try {
    const on = await isActivationFlagEnabled('growth_stuck_cohorts_v1');
    if (!on) {
      return res.status(503).json({
        error: 'growth_stuck_cohorts_v1 är avstängd',
        autoSendAllowed: false,
      });
    }
    next();
  } catch (err) {
    next(err);
  }
}

router.get('/growth/stuck-cohorts/summary', requireFlag, async (req, res) => {
  try {
    const maxAgeDays = Math.min(Math.max(parseInt(req.query.maxAgeDays, 10) || 14, 1), 90);
    const minAgeHours = Math.min(Math.max(parseInt(req.query.minAgeHours, 10) || 48, 1), 168);
    const includeInternalQa = req.query.includeQa === '1' || req.query.includeQa === 'true';
    const summary = await summarizeGrowthStuckCohorts({
      maxAgeDays,
      minAgeHours,
      includeInternalQa,
    });
    res.json({ ...summary, cohorts: Object.keys(COHORTS) });
  } catch (err) {
    console.error('[ADMIN growth-stuck] summary error:', err);
    res.status(500).json({ error: 'Kunde inte hämta kohort-sammanfattning', detail: err.message });
  }
});

router.get('/growth/stuck-cohorts', requireFlag, async (req, res) => {
  try {
    const maxAgeDays = Math.min(Math.max(parseInt(req.query.maxAgeDays, 10) || 14, 1), 90);
    const minAgeHours = Math.min(Math.max(parseInt(req.query.minAgeHours, 10) || 48, 1), 168);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
    const includeInternalQa = req.query.includeQa === '1' || req.query.includeQa === 'true';
    const cohort = typeof req.query.cohort === 'string' ? req.query.cohort : null;
    const families = await listGrowthStuckCohorts({
      maxAgeDays,
      minAgeHours,
      limit,
      includeInternalQa,
      cohort,
    });
    res.json({
      generatedAt: new Date().toISOString(),
      maxAgeDays,
      minAgeHours,
      cohort: cohort || 'all',
      count: families.length,
      autoSendAllowed: false,
      note: 'Preview only — human approval required before any outreach.',
      families,
    });
  } catch (err) {
    console.error('[ADMIN growth-stuck] list error:', err);
    res.status(500).json({ error: 'Kunde inte hämta fastnade familjer', detail: err.message });
  }
});

module.exports = router;
