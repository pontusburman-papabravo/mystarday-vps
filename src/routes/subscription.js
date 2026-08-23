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
const {
  getFamilyAccess,
  toChildPackageAccess,
} = require('../lib/package-access');
const { getAllMergedPreviewPackages } = require('../lib/preview-package-config');
const {
  INTEREST_COMPONENTS,
  INTEREST_SOURCES,
  PACKAGE_LABELS,
} = require('../lib/package-interest-constants');
const { COMPONENT_PRICE_MAP } = require('../../config/subscription-components');
const { resolveFamilyEntitlements } = require('../lib/family-entitlements');
const { resolveSubscriptionUiVisibility } = require('../lib/subscription-ui-visibility');

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
router.get('/preview-data', requireAuth, async (req, res) => {
  try {
    const packages = await getAllMergedPreviewPackages();
    res.json(packages);
  } catch (err) {
    console.error('[SUBSCRIPTION] preview-data error:', err);
    res.status(500).json({ error: 'Kunde inte hämta förhandsvisning' });
  }
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
    if (req.user.type === 'child') {
      return res.json(toChildPackageAccess(access));
    }
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
    const [{ premium, requires_paywall, payment_start_at }, sub] = await Promise.all([
      resolveFamilyEntitlements(familyId),
      familySubscriptions.getByFamilyId(familyId),
    ]);
    const payment_enabled = await appSettings.getPaymentEnabled();
    const billing_ui_enabled = await isBillingUiEnabled();
    const uiVisibility = await resolveSubscriptionUiVisibility(familyId, premium);
    const price = await appSettings.getBasicPrice();
    const {
      PREMIUM_PRICE_MONTHLY_SEK,
      PREMIUM_PRICE_YEARLY_SEK,
      STORE_PRODUCT_MONTHLY,
      STORE_PRODUCT_YEARLY,
    } = require('../../config/iap-product-contract');

    res.json({
      tier: premium.is_grandfathered ? 'lifetime_free' : (premium.active ? (premium.trial ? 'trial' : 'paid') : 'expired'),
      premium,
      requires_paywall: !!requires_paywall,
      payment_start_at,
      trial_days_remaining: premium.trial && premium.expires_at
        ? Math.max(0, Math.ceil((new Date(premium.expires_at) - new Date()) / 86400000))
        : null,
      trial_expired: premium.trial && premium.expires_at ? new Date(premium.expires_at) <= new Date() : false,
      trial_expires_at: premium.trial ? premium.expires_at : (sub?.trial_expires_at || null),
      components: sub?.components || [],
      payment_enabled,
      billing_ui_enabled,
      subscription_ui_visible: uiVisibility.subscription_ui_visible,
      native_purchase_eligible: uiVisibility.native_purchase_eligible,
      iap_enabled: payment_enabled,
      upgrade_url: requires_paywall ? '/paywall' : (billing_ui_enabled ? '/settings#prenumeration' : null),
      limited_account_url: '/limited-account',
      price_monthly_sek: PREMIUM_PRICE_MONTHLY_SEK || price || 59,
      price_yearly_sek: PREMIUM_PRICE_YEARLY_SEK || 590,
      products: {
        monthly: STORE_PRODUCT_MONTHLY,
        yearly: STORE_PRODUCT_YEARLY,
      },
      web_purchase_supported: false,
    });
  } catch (err) {
    console.error('[SUBSCRIPTION] status error:', err);
    res.status(500).json({ error: 'Kunde inte hämta prenumerationsstatus' });
  }
});

/**
 * GET /api/subscription/entitlements — canonical Premium resolver payload.
 */
router.get('/entitlements', requireParent, async (req, res) => {
  try {
    const familyId = req.user.familyId || req.user.family_id;
    const resolved = await resolveFamilyEntitlements(familyId);
    res.json(resolved);
  } catch (err) {
    console.error('[SUBSCRIPTION] entitlements error:', err);
    res.status(500).json({ error: 'Kunde inte hämta tillgång' });
  }
});

module.exports = router;
