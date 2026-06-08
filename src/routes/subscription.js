/**
 * Subscription status routes.
 * Owns: exposing family subscription state to the frontend.
 * Does NOT own: IAP purchase UI (native RevenueCat), component enforcement.
 */

const express = require('express');
const { requireParent } = require('../middleware/auth');
const familySubscriptions = require('../../db/family-subscriptions');
const { STRIPE_COMPONENT_MAP } = require('../../config/subscription-components');

const router = express.Router();

// Web Stripe checkout removed — subscriptions handled via Apple/Google IAP (RevenueCat).
const PAYMENT_ENABLED = false;

/**
 * GET /api/subscription/status
 * Returns the full subscription state for the authenticated family.
 * Frontend uses this to decide whether to show trial banners, upgrade CTAs, etc.
 */
router.get('/status', requireParent, async (req, res) => {
  try {
    const familyId = req.user.familyId || req.user.family_id;
    const sub = await familySubscriptions.getByFamilyId(familyId);

    if (!sub) {
      // Legacy family without subscription record — treat as lifetime_free
      return res.json({
        tier: 'lifetime_free',
        trial_days_remaining: null,
        trial_expired: false,
        components: [{ component: 'basic_app', expires_at: null }],
        payment_enabled: PAYMENT_ENABLED,
        iap_enabled: true,
        upgrade_url: '/upgrade',
        price_monthly_sek: STRIPE_COMPONENT_MAP.basic_app?.price_monthly_sek || 59,
      });
    }

    // Calculate trial days remaining
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
      payment_enabled: PAYMENT_ENABLED,
      iap_enabled: true,
      upgrade_url: '/upgrade',
      price_monthly_sek: STRIPE_COMPONENT_MAP.basic_app?.price_monthly_sek || 59,
    });
  } catch (err) {
    console.error('[SUBSCRIPTION] status error:', err);
    res.status(500).json({ error: 'Kunde inte hämta prenumerationsstatus' });
  }
});

module.exports = router;
