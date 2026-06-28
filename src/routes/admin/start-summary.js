/**
 * GET /api/admin/start-summary — composed Start dashboard data (Fas 2A).
 */
const express = require('express');
const startSummary = require('../../../db/start-summary');

const router = express.Router();

router.get('/start-summary', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    const data = await startSummary.buildStartSummary();
    res.json(data);
  } catch (err) {
    console.error('[ADMIN] start-summary error:', err);
    next(err);
  }
});

module.exports = router;
