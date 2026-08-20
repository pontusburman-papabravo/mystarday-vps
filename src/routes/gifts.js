'use strict';

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
    res.status(500).json({ error: 'Kunde inte hämta presentkortsinställningar' });
  }
});

router.post('/redeem', requireParent, validate(RedeemSchema), async (req, res) => {
  try {
    const familyId = req.user.familyId || req.user.family_id;
    const result = await redeemGiftCode(familyId, req.body.code, {
      ipAddress: req.ip,
    });

    if (!result.ok) {
      return res.status(400).json({
        error: result.message,
        code: result.code,
      });
    }

    const { premium: familyPremium } = await resolveFamilyEntitlements(familyId);
    res.json({
      ok: true,
      message: 'Presentkortet är inlöst!',
      premium: familyPremium,
      gift: result.premium,
    });
  } catch (err) {
    console.error('[GIFTS] redeem error:', err.message);
    res.status(500).json({ error: 'Kunde inte lösa in presentkortet' });
  }
});

module.exports = router;
