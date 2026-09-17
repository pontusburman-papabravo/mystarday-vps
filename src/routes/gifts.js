'use strict';

const { sendApiError } = require('../lib/api-user-error');

/**
 * Gift card public + authenticated routes (web purchase + redeem).
 */
const express = require('express');
const { z } = require('zod');
const { requireParent } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { redeemGiftCode } = require('../lib/gift-cards');
const { getGiftSettings } = require('../lib/payment-settings');
const { resolveFamilyEntitlements } = require('../lib/family-entitlements');

const router = express.Router();

const RedeemSchema = z.object({
  code: z.string().min(4).max(64),
});

router.get('/settings', async (_req, res) => {
  try {
    const settings = await getGiftSettings();
    res.json({
      enabled: !!settings.gift_cards_enabled,
      sales_enabled: !!settings.gift_cards_sales_enabled,
      price_sek: settings.gift_price_sek,
      premium_months: settings.gift_premium_months,
      online_checkout_max: settings.gift_online_checkout_max,
      discount_contact_threshold: settings.gift_discount_contact_threshold,
      invoice_threshold: settings.gift_invoice_threshold,
      checkout_available: false,
      checkout_note: 'EXTERNAL_VERIFICATION_REQUIRED — Stripe gift checkout pending compliance verification',
    });
  } catch (err) {
    console.error('[GIFTS] settings error:', err.message);
    sendApiError(res, 500, 'GIFT_SETTINGS_FAILED');
  }
});

router.post('/redeem', requireParent, validate(RedeemSchema), async (req, res) => {
  try {
    const familyId = req.user.familyId || req.user.family_id;
    const result = await redeemGiftCode(familyId, req.body.code, {
      ipAddress: req.ip,
    });

    if (!result.ok) {
      return sendApiError(res, 400, result.code || 'GIFT_INVALID_CODE');
    }

    const { premium: familyPremium } = await resolveFamilyEntitlements(familyId);
    res.json({
      ok: true,
      code: 'GIFT_REDEEMED',
      premium: familyPremium,
      gift: result.premium,
    });
  } catch (err) {
    console.error('[GIFTS] redeem error:', err.message);
    sendApiError(res, 500, 'GIFT_REDEEM_FAILED');
  }
});

module.exports = router;
