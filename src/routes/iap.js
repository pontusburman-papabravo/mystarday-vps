/**
 * In-App Purchase routes — RevenueCat SDK config.
 * Webhook handler is mounted in app.js before express.json() (see iap-webhook-handler.js).
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getPublicSdkKeyForPlatform,
  getLegacyPublicApiKey,
  getEntitlementId,
  DEFAULT_PRODUCT_ID,
} = require('../lib/iap-client-config');

router.get('/config', requireAuth, (req, res) => {
  const platform = String(req.query.platform || '').toLowerCase() === 'android' ? 'android' : 'ios';
  const apiKey = getPublicSdkKeyForPlatform(platform) || getLegacyPublicApiKey();
  res.json({
    apiKey: apiKey || null,
    productId: process.env.REVENUECAT_DEFAULT_PRODUCT_ID || DEFAULT_PRODUCT_ID,
    entitlementId: getEntitlementId(),
  });
});

module.exports = router;
