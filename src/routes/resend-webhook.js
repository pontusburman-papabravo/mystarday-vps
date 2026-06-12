/**
 * POST /api/resend/webhook — Resend email events (opened, clicked, delivered).
 * Mounted in server.js BEFORE express.json() (raw body for Svix verification).
 */
const {
  markDelivered,
  markOpened,
  markClicked,
} = require('../../db/newsletter-email-tracking');
const { verifyResendWebhook } = require('../lib/resend-webhook-verify');

async function handleResendWebhook(req, res) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[RESEND-WEBHOOK] RESEND_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  const event = verifyResendWebhook(req.body, req.headers, secret);
  if (!event) {
    console.warn('[RESEND-WEBHOOK] Signature verification failed');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const type = event.type;
  const data = event.data || {};
  const emailId = data.email_id;
  if (!emailId) {
    return res.status(200).json({ received: true, skipped: 'no email_id' });
  }

  const occurredAt = event.created_at ? new Date(event.created_at) : new Date();

  try {
    if (type === 'email.delivered') {
      await markDelivered(emailId, occurredAt);
    } else if (type === 'email.opened') {
      await markOpened(emailId, occurredAt);
    } else if (type === 'email.clicked') {
      const link = data.click?.link || null;
      await markClicked(emailId, occurredAt, link);
    }
  } catch (err) {
    console.error('[RESEND-WEBHOOK] DB error:', err.message);
    return res.status(500).json({ error: 'Processing failed' });
  }

  return res.status(200).json({ received: true });
}

module.exports = { handleResendWebhook };
