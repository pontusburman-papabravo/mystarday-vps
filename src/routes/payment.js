/**
 * Payment success route — verifies Stripe checkout and injects pixel data.
 * Owns: Stripe Checkout session lookup for conversion pixels.
 * Does NOT own: Stripe webhook handling, payment creation.
 */
const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

router.get('/success', async (req, res) => {
  const { hasAccess } = require('../../db/features');
  const allowed = await hasAccess(null, 'betalning');
  if (!allowed) {
    return res.redirect('/dashboard?error=betalning_aktiverad');
  }
  const sessionId = req.query.checkout_session_id || req.query.session_id;
  if (!sessionId) {
    return res.redirect('/?error=missing_session');
  }

  let paymentData = null;
  try {
    if (process.env.STRIPE_SECRET_KEY) {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-04-30.basil' });
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === 'paid' || session.status === 'complete') {
        paymentData = {
          amount: (session.amount_total || 0) / 100,
          currency: (session.currency || 'sek').toUpperCase(),
        };
      }
    }
  } catch (err) {
    console.error('[payment/success] Stripe verification error:', err.message);
  }

  const htmlPath = path.join(__dirname, '..', '..', 'public', 'payment-success.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  const pixelData = paymentData
    ? JSON.stringify({ amount: paymentData.amount, currency: paymentData.currency || 'SEK' })
    : 'null';
  html = html.replace('__PIXEL_PAYMENT_DATA__', pixelData);
  res.type('html').send(html);
});

module.exports = router;
