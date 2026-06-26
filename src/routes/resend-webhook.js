/**
 * POST /api/resend/webhook — Resend email events (opened, clicked, delivered).
 * Mounted in server.js BEFORE express.json() (raw body for Svix verification).
 */
const {
  markDelivered,
  markOpened,
  markClicked,
} = require('../../db/newsletter-email-tracking');
const { logEvent } = require('../../db/resend-webhook-events');
const { verifyResendWebhook } = require('../lib/resend-webhook-verify');
const { autoUnsubscribeFromDeliveryEvent } = require('../lib/newsletter-unsubscribe');

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

  await logEvent(type, emailId);

  try {
    let updated = 0;
    if (type === 'email.delivered') {
      updated = await markDelivered(emailId, occurredAt);
    } else if (type === 'email.opened') {
      updated = await markOpened(emailId, occurredAt);
    } else if (type === 'email.clicked') {
      const link = data.click?.link || null;
      updated = await markClicked(emailId, occurredAt, link);
    } else if (type === 'email.bounced') {
      const to = Array.isArray(data.to) ? data.to[0] : data.to;
      const bounceType = data.bounce?.type || data.bounce?.bounce_type || null;
      await autoUnsubscribeFromDeliveryEvent({
        resendEmailId: emailId,
        recipientEmail: to,
        reason: 'bounce',
        bounceType,
      });
      return res.status(200).json({ received: true, action: 'bounce_processed' });
    } else if (type === 'email.complained') {
      const to = Array.isArray(data.to) ? data.to[0] : data.to;
      await autoUnsubscribeFromDeliveryEvent({
        resendEmailId: emailId,
        recipientEmail: to,
        reason: 'complaint',
      });
      return res.status(200).json({ received: true, action: 'complaint_processed' });
    } else {
      return res.status(200).json({ received: true, ignored: type });
    }

    if (updated === 0) {
      console.warn('[RESEND-WEBHOOK] No newsletter_email_send row for email_id=%s type=%s', emailId, type);
    }
  } catch (err) {
    console.error('[RESEND-WEBHOOK] DB error:', err.message);
    return res.status(500).json({ error: 'Processing failed' });
  }

  return res.status(200).json({ received: true });
}

module.exports = { handleResendWebhook };
