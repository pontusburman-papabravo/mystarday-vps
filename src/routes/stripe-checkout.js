/**
 * Stripe checkout session creation.
 * Owns: creating Stripe Checkout sessions for subscription upgrades.
 * Does NOT own: webhook handling, payment verification.
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const appSettings = require('../../db/app-settings');

let stripe = null;
function getStripe() {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-04-30.basil' });
  }
  if (!stripe) throw new Error('STRIPE_SECRET_KEY not configured');
  return stripe;
}

/**
 * POST /api/stripe/create-checkout-session
 * Creates a Stripe Checkout session for the authenticated family.
 * Reads stripe_price_id from app_settings (set via /api/stripe-setup/create).
 * Requires: valid parent session.
 * Returns: { url } — redirect URL to Stripe Checkout.
 */
router.post('/create-checkout-session', requireAuth, async (req, res) => {
  try {
    const priceId = await appSettings.getStripePriceId();
    if (!priceId) {
      console.error('[stripe-checkout] No stripe_price_id configured in app_settings');
      return res.status(500).json({ error: 'Betalningskonfiguration saknas. Kontakta admin.' });
    }

    const s = getStripe();
    const familyId = req.user.familyId || req.user.family_id;
    const parentEmail = req.user.email;

    const session = await s.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: parentEmail,
      metadata: { family_id: familyId },
      success_url: `${req.protocol}://${req.get('host')}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/upgrade`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[stripe-checkout] Session creation failed:', err.message);
    res.status(500).json({ error: 'Kunde inte skapa betalningslänken' });
  }
});

module.exports = router;