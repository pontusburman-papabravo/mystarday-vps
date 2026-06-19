/**
 * Subscription status routes.
 * Owns: exposing family subscription state to the frontend.
 * Does NOT own: IAP purchase UI (native RevenueCat), component enforcement.
 */

const express = require('express');
const { requireAuth, requireParent } = require('../middleware/auth');
const familySubscriptions = require('../../db/family-subscriptions');
const appSettings = require('../../db/app-settings');
const { getFamilyAccess } = require('../lib/package-access');
const { STRIPE_COMPONENT_MAP } = require('../../config/subscription-components');

const router = express.Router();

/**
 * GET /api/subscription/access
 * Unified package access for client (§6.6, §16.3).
 */
router.get('/access', requireAuth, async (req, res) => {
  try {
    const familyId = req.user.familyId || req.user.family_id;
    if (!familyId) {
      return res.status(400).json({ error: 'Ingen familj kopplad till kontot' });
    }

    const session = {
      preferredViewMode: req.query.view_mode || req.user.preferred_view_mode,
      hasActiveTeacchActivity: req.query.teacch_active === '1',
    };

    const access = await getFamilyAccess(familyId, req.user, session);
    res.json(access);
  } catch (err) {
    console.error('[SUBSCRIPTION] access error:', err);
    res.status(500).json({ error: 'Kunde inte hämta pakettillgång' });
  }
});

/**
 * GET /api/subscription/status
 * Returns the full subscription state for the authenticated family.
 */
router.get('/status', requireParent, async (req, res) => {
  try {
    const familyId = req.user.familyId || req.user.family_id;
    const sub = await familySubscriptions.getByFamilyId(familyId);
    const payment_enabled = await appSettings.getPaymentEnabled();
    const price = await appSettings.getBasicPrice();

    if (!sub) {
      return res.json({
        tier: 'lifetime_free',
        trial_days_remaining: null,
        trial_expired: false,
        components: [{ component: 'basic_app', expires_at: null }],
        payment_enabled,
        iap_enabled: payment_enabled,
        upgrade_url: '/upgrade',
        price_monthly_sek: price || 59,
      });
    }

    let trialDaysRemaining = null;
    let trialExpired = false;
    if (sub.tier === 'trial' && sub.trial_expires_at) {
      const diff = new Date(sub.trial_expires_at) - new Date();
      trialDaysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      trialExpired = diff <= 0;
    }

    res.json({
      tier: sub.tier,
      trial_days_remaining: trialDaysRemaining,
      trial_expired: trialExpired,
      trial_expires_at: sub.trial_expires_at || null,
      components: sub.components || [],
      payment_enabled,
      iap_enabled: payment_enabled,
      upgrade_url: '/upgrade',
      price_monthly_sek: price || STRIPE_COMPONENT_MAP.basic_app?.price_monthly_sek || 59,
    });
  } catch (err) {
    console.error('[SUBSCRIPTION] status error:', err);
    res.status(500).json({ error: 'Kunde inte hämta prenumerationsstatus' });
  }
});

module.exports = router;
