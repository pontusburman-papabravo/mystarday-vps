/**
 * POST /api/iap/webhook — RevenueCat subscription sync.
 * Mounted in app.js BEFORE express.json() (raw body for auth verification).
 */
'use strict';

const { authenticateRevenueCatWebhook } = require('../lib/revenuecat-webhook-verify');
const { processRevenueCatEvent } = require('../lib/revenuecat-webhook-process');
const { formatOrphanWarnFields } = require('../lib/revenuecat-webhook-audit');

async function handleIapWebhook(req, res) {
  const db = require('../lib/db');
  const staticSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
  const signingSecret = process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET;
  if (!staticSecret && !signingSecret) {
    console.error('[iap-webhook] Webhook auth not configured — rejecting');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  const bodyBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');

  if (!authenticateRevenueCatWebhook(req, bodyBuffer)) {
    console.error('[iap-webhook] Authentication failed');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let payload;
  try {
    payload = JSON.parse(bodyBuffer.toString('utf8'));
  } catch {
    console.error('[iap-webhook] Invalid JSON body');
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const event = payload?.event;
  if (!event || typeof event !== 'object') {
    console.warn('[iap-webhook] Missing event object');
    return res.status(400).json({ error: 'Missing event' });
  }

  if (!event.type) {
    console.warn('[iap-webhook] Missing event type');
    return res.status(400).json({ error: 'Missing event type' });
  }

  const appUserId = event.app_user_id || event.original_app_user_id
    || (Array.isArray(event.aliases) && event.aliases[0]);
  if (!appUserId) {
    console.warn('[iap-webhook] Missing app user identity');
    return res.status(400).json({ error: 'Missing app user identity' });
  }

  console.log(`[iap-webhook] Received event: ${event.type} id=${event.id || 'unknown'}`);

  try {
    const result = await processRevenueCatEvent(db, event);

    if (result.duplicate) {
      console.log(`[iap-webhook] Duplicate event ${event.id} — already processed`);
      return res.status(200).json({ received: true, duplicate: true });
    }

    if (result.skipped) {
      if (result.reason === 'family_not_found') {
        const fields = formatOrphanWarnFields(event);
        console.warn(
          '[iap-webhook] WARN RevenueCat webhook orphan — ' +
          `event=${fields.event_id} type=${fields.event_type} ` +
          `app_user_id=${fields.app_user_id} original_app_user_id=${fields.original_app_user_id} ` +
          `product_id=${fields.product_id} expiration_at_ms=${fields.expiration_at_ms} ` +
          `skip_reason=${fields.skip_reason}`
        );
      } else {
        console.log(`[iap-webhook] Skipped event ${event.id}: ${result.reason}`);
      }
      return res.status(200).json({
        received: true,
        skipped: result.reason,
        duplicate: result.duplicate === true,
      });
    }

    console.log(
      `[iap-webhook] Family ${result.familyId} subscription_status → ${result.subscriptionStatus}`
    );
    return res.status(200).json({ received: true, processed: true });
  } catch (err) {
    if (err.code === 'INVALID_EVENT' || err.code === 'MISSING_IDENTITY') {
      return res.status(400).json({ error: err.message });
    }
    console.error('[iap-webhook] Processing failed:', err.message);
    return res.status(503).json({ error: 'Processing failed' });
  }
}

module.exports = { handleIapWebhook };
