'use strict';

/**
 * Admin — growth stuck cohorts (preview segments, no auto-send).
 * GET /api/admin/growth/stuck-cohorts
 * GET /api/admin/growth/stuck-cohorts/summary
 *
 * Admin work-queue read path. Always available to requireAdmin.
 * growth_stuck_cohorts_v1 is reserved for future intervention/send — not this list.
 */

const express = require('express');
const {
  listGrowthStuckCohorts,
  summarizeGrowthStuckCohorts,
  COHORTS,
} = require('../../../db/growth-stuck-cohorts');

const router = express.Router();

function parseWindow(query) {
  const maxAgeDays = Math.min(Math.max(parseInt(query.maxAgeDays, 10) || 14, 1), 90);
  const minAgeHours = Math.min(Math.max(parseInt(query.minAgeHours, 10) || 48, 1), 168);
  const includeInternalQa = query.includeQa === '1' || query.includeQa === 'true';
  return { maxAgeDays, minAgeHours, includeInternalQa };
}

router.get('/growth/stuck-cohorts/summary', async (req, res) => {
  try {
    const { maxAgeDays, minAgeHours, includeInternalQa } = parseWindow(req.query);
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

router.get('/growth/stuck-cohorts', async (req, res) => {
  try {
    const { maxAgeDays, minAgeHours, includeInternalQa } = parseWindow(req.query);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
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
      note: 'Work queue — manual next step only. No auto-send.',
      families,
    });
  } catch (err) {
    console.error('[ADMIN growth-stuck] list error:', err);
    res.status(500).json({ error: 'Kunde inte hämta fastnade familjer', detail: err.message });
  }
});

module.exports = router;
