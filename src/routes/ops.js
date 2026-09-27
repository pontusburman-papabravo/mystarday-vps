/**
 * Machine-readable ops endpoints. Bearer token auth — no admin session.
 */
'use strict';

const express = require('express');
const { irelandFunnelMonitorLimiter } = require('../middleware/rateLimiter');
const { requireIrelandFunnelMonitorAuth } = require('../middleware/ireland-funnel-monitor-auth');
const { getIrelandFunnelHealth } = require('../../db/ireland-funnel-health');

const router = express.Router();

router.use(irelandFunnelMonitorLimiter);
router.use(requireIrelandFunnelMonitorAuth);

router.get('/ireland-funnel-health', async (req, res, next) => {
  try {
    const payload = await getIrelandFunnelHealth();
    res.json(payload);
  } catch (err) {
    console.error('[ops/ireland-funnel-health] query failed:', err.message);
    next(err);
  }
});

module.exports = router;
