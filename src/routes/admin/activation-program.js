'use strict';

/**
 * Admin — activation program experiment analytics (Fas 6B).
 */

const express = require('express');
const {
  parseWindowDays,
  buildActivationRetentionReport,
} = require('../../lib/activation-program-cohort-analytics');
const { RETENTION_WINDOWS } = require('../../lib/activation-program-retention');

const router = express.Router();

/**
 * GET /api/admin/activation-program/retention?window=14|30|60
 */
router.get('/activation-program/retention', async (req, res) => {
  try {
    const windowDays = parseWindowDays(req.query.window ?? '14');
    if (windowDays == null) {
      return res.status(400).json({
        error: `Ogiltigt window — tillåtna värden: ${RETENTION_WINDOWS.join(', ')}`,
      });
    }

    const report = await buildActivationRetentionReport({ windowDays });
    res.json(report);
  } catch (err) {
    console.error('[ADMIN activation-program] retention error:', err);
    res.status(500).json({ error: 'Kunde inte hämta aktiverings-retention' });
  }
});

module.exports = router;
