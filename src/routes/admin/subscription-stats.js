/**
 * Admin: subscription package KPIs (§9.10.4).
 */

const express = require('express');
const { getSubscriptionStats } = require('../../../db/subscription-admin-stats');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const period = ['7d', '30d', '90d'].includes(req.query.period) ? req.query.period : '30d';
    const stats = await getSubscriptionStats(period);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
