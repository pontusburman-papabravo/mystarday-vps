/**
 * Subscription status routes.
 * Owns: exposing family subscription state to the frontend.
 * Does NOT own: IAP purchase UI (native RevenueCat), component enforcement.
 */

const express = require('express');
const { z } = require('zod');
const { requireAuth, requireParent } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const familySubscriptions = require('../../db/family-subscriptions');
const packageInterest = require('../../db/package-interest');
const appSettings = require('../../db/app-settings');
const { isBillingUiEnabled } = require('../lib/billing-ui');
const analytics = require('../../db/analytics');
const { getFamilyAccess } = require('../lib/package-access');
const { getAllPreviewPackages } = require('../../config/preview-data');
const {
  INTEREST_COMPONENTS,
  INTEREST_SOURCES,
  PACKAGE_LABELS,
} = require('../lib/package-interest-constants');
const { STRIPE_COMPONENT_MAP } = require('../../config/subscription-components');

const router = express.Router();

const InterestBodySchema = z.object({
  component: z.enum(INTEREST_COMPONENTS),
  source: z.enum(INTEREST_SOURCES),
  comment: z.string().max(280).nullable().optional(),
});

/**
 * GET /api/subscription/preview-data
 * Central mock content for preview-shell (§9.6).
 */
router.get('/preview-data', requireAuth, (req, res) => {
  res.json(getAllPreviewPackages());
});

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
 * POST /api/subscription/interest
 * Register beta waitlist interest (§9.8). Interest phase only.
 */
router.post('/interest', requireParent, validate(InterestBodySchema), async (req, res) => {
  try {
    const familyId = req.user.familyId || req.user.family_id;
    const parentId = req.user.id;
    const { component, source, comment = null } = req.body;

    const access = await getFamilyAccess(familyId, req.user);
    if (access.rollout_mode !== 'interest') {
      return res.status(400).json({
        error: 'Intresseanmälan är inte aktiv just nu',
        code: 'INTEREST_NOT_ENABLED',
      });
    }

    if (access.components[component]?.has) {
      return res.status(400).json({
        error: 'Er familj har redan tillgång till detta paket',
        code: 'COMPONENT_ALREADY_ACTIVE',
      });
    }

    const { alreadyRegistered } = await packageInterest.registerInterest(
      familyId,
      parentId,
      component,
      source,
      comment
    );

    await analytics.track(familyId, 'interest_registered', { component, source });

    const label = PACKAGE_LABELS[component] || component;
    res.json({
      ok: true,
      already_registered: alreadyRegistered,
      message: alreadyRegistered
        ? `Ni står redan på väntelistan för ${label}.`
        : 'Tack! Vi har noterat ditt intresse.',
    });
  } catch (err) {
    console.error('[SUBSCRIPTION] interest error:', err);
    res.status(500).json({ error: 'Kunde inte registrera intresse' });
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
    const billing_ui_enabled = await isBillingUiEnabled();
    const price = await appSettings.getBasicPrice();

    if (!sub) {
      return res.json({
        tier: 'lifetime_free',
        trial_days_remaining: null,
        trial_expired: false,
        components: [{ component: 'basic_app', expires_at: null }],
        payment_enabled,
        billing_ui_enabled,
        iap_enabled: payment_enabled,
        upgrade_url: billing_ui_enabled ? '/upgrade' : null,
        price_monthly_sek: billing_ui_enabled ? (price || 59) : null,
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
      billing_ui_enabled,
      iap_enabled: payment_enabled,
      upgrade_url: billing_ui_enabled ? '/upgrade' : null,
      price_monthly_sek: billing_ui_enabled
        ? (price || STRIPE_COMPONENT_MAP.basic_app?.price_monthly_sek || 59)
        : null,
    });
  } catch (err) {
    console.error('[SUBSCRIPTION] status error:', err);
    res.status(500).json({ error: 'Kunde inte hämta prenumerationsstatus' });
  }
});

module.exports = router;
