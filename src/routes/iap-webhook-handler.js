/**
 * POST /api/iap/webhook — RevenueCat subscription sync.
 * Mounted in app.js BEFORE express.json() (raw body for auth verification).
 */
'use strict';

const { authenticateRevenueCatWebhook } = require('../lib/revenuecat-webhook-verify');
const { processRevenueCatEvent } = require('../lib/revenuecat-webhook-process');

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
      console.log(`[iap-webhook] Skipped event ${event.id}: ${result.reason}`);
      return res.status(200).json({ received: true, skipped: result.reason });
    }

    console.log(
      `[iap-webhook] Family ${result.familyId} subscription_status → ${result.subscriptionStatus}`
    );
    return res.status(200).json({ received: true });
  } catch (err) {
    if (err.code === 'FAMILY_NOT_FOUND') {
      console.warn('[iap-webhook] Family not found for event identity');
      return res.status(404).json({ error: 'Family not found' });
    }
    if (err.code === 'INVALID_EVENT' || err.code === 'MISSING_IDENTITY') {
      return res.status(400).json({ error: err.message });
    }
    console.error('[iap-webhook] Processing failed:', err.message);
    return res.status(503).json({ error: 'Processing failed' });
  }
}

module.exports = { handleIapWebhook };
