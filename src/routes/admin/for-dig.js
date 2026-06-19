'use strict';

/**
 * Admin — För dig feedback & install stats.
 */

const express = require('express');
const feedbackDb = require('../../../db/for-dig-goal-feedback');
const favoritesDb = require('../../../db/for-dig-favorites');

const router = express.Router();

router.get('/for-dig/installations', async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 90;
    const minCount = parseInt(req.query.min_count, 10) || 1;
    const rows = await favoritesDb.getInstallLeaderboard(days, minCount);
    res.json({ installations: rows, days, min_count: minCount });
  } catch (err) {
    console.error('[ADMIN for-dig] installations error:', err);
    res.status(500).json({ error: 'Kunde inte hämta installationer' });
  }
});

router.get('/for-dig/installation-log', async (req, res) => {
  try {
    const { goal_slug, days, limit, offset } = req.query;
    const data = await feedbackDb.listInstallLog({
      goalSlug: goal_slug || null,
      days: days ? parseInt(days, 10) : 90,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    res.json(data);
  } catch (err) {
    console.error('[ADMIN for-dig] installation-log error:', err);
    res.status(500).json({ error: 'Kunde inte hämta installationslogg' });
  }
});

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
    const { goal_slug, phase, outcome_min, outcome_tier, has_free_text, days, limit, offset } = req.query;
    const data = await feedbackDb.listResponses({
      goalSlug: goal_slug || null,
      phase: phase || null,
      outcomeMin: outcome_min || null,
      outcomeTier: outcome_tier || null,
      hasFreeText: has_free_text || null,
      days: days ? parseInt(days, 10) : null,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    res.json(data);
  } catch (err) {
    console.error('[ADMIN for-dig] responses error:', err);
    res.status(500).json({ error: 'Kunde inte hämta svar' });
  }
});

router.get('/for-dig/quotes', async (req, res) => {
  try {
    const { limit, offset } = req.query;
    const data = await feedbackDb.listQuotes({
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    res.json(data);
  } catch (err) {
    console.error('[ADMIN for-dig] quotes error:', err);
    res.status(500).json({ error: 'Kunde inte hämta citat' });
  }
});

router.get('/for-dig/pending-outcomes', async (req, res) => {
  try {
    const { limit, offset } = req.query;
    const data = await feedbackDb.listPendingOutcomesAdmin({
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    res.json(data);
  } catch (err) {
    console.error('[ADMIN for-dig] pending-outcomes error:', err);
    res.status(500).json({ error: 'Kunde inte hämta väntande outcome' });
  }
});

module.exports = router;
