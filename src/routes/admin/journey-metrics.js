'use strict';

const express = require('express');
const { getJourneyFas2Metrics } = require('../../lib/journey/metrics');

const router = express.Router();

router.get('/journey/metrics', async (req, res) => {
  try {
    const metrics = await getJourneyFas2Metrics();
    res.json(metrics);
  } catch (err) {
    console.error('[ADMIN] journey/metrics error:', err);
    res.status(500).json({ error: 'Kunde inte hämta journey-metrics' });
  }
});

module.exports = router;
