'use strict';

/**
 * Admin — För dig feedback & install stats.
 */

const express = require('express');
const feedbackDb = require('../../db/for-dig-goal-feedback');

const router = express.Router();

router.get('/for-dig/stats', async (req, res) => {
  try {
    const stats = await feedbackDb.getAdminStats();
    res.json(stats);
  } catch (err) {
    console.error('[ADMIN for-dig] stats error:', err);
    res.status(500).json({ error: 'Kunde inte hämta För dig-statistik' });
  }
});

router.get('/for-dig/responses', async (req, res) => {
  try {
    const { goal_slug, phase, outcome_min, limit, offset } = req.query;
    const data = await feedbackDb.listResponses({
      goalSlug: goal_slug || null,
      phase: phase || null,
      outcomeMin: outcome_min || null,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    res.json(data);
  } catch (err) {
    console.error('[ADMIN for-dig] responses error:', err);
    res.status(500).json({ error: 'Kunde inte hämta svar' });
  }
});

module.exports = router;
