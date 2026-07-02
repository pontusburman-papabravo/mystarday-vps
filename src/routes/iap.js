/**
 * In-App Purchase routes — RevenueCat SDK config.
 * Webhook handler is mounted in app.js before express.json() (see iap-webhook-handler.js).
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

router.get('/config', requireAuth, (req, res) => {
  res.json({
    apiKey: process.env.REVENUECAT_API_KEY || null,
    productId: 'se.mystarday.app.basic',
    entitlementId: 'basic',
  });
});

module.exports = router;
