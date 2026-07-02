/**
 * POST /api/iap/webhook — RevenueCat subscription sync.
 * Mounted in app.js BEFORE express.json() (raw body for HMAC verification).
 */
'use strict';

const crypto = require('crypto');
const db = require('../lib/db');

async function handleIapWebhook(req, res) {
  const authHeader = req.headers['authorization'] || '';
  const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[iap-webhook] REVENUECAT_WEBHOOK_SECRET not configured — rejecting webhook');
    return res.status(500).json({ error: 'Webhook not configured' });
  }
  if (!authHeader) {
    console.error('[iap-webhook] Missing Authorization header');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parts = authHeader.split(':');
  if (parts.length < 2) {
    console.error('[iap-webhook] Malformed Authorization header');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const providedSig = parts.slice(1).join(':');
  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(req.body)
    .digest('base64');

  const providedBuf = Buffer.from(providedSig);
  const expectedBuf = Buffer.from(expectedSig);
  if (providedBuf.length !== expectedBuf.length
    || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
    console.error('[iap-webhook] Signature mismatch');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let payload;
  try {
    payload = JSON.parse(req.body);
  } catch {
    console.error('[iap-webhook] Invalid JSON body');
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const eventType = payload?.event?.type;
  const appUserId = payload?.event?.data?.attributes?.app_user_id;
  if (!eventType) {
    console.warn('[iap-webhook] Missing event type in payload');
    return res.status(200).json({ received: true });
  }
  if (!appUserId) {
    console.warn('[iap-webhook] Missing app_user_id in payload');
    return res.status(200).json({ received: true });
  }

  console.log(`[iap-webhook] Received event: ${eventType} for app_user_id: ${appUserId}`);

  const eventStatusMap = {
    INITIAL_PURCHASE: 'active',
    RENEWAL: 'active',
    CANCELLATION: 'cancelled',
    EXPIRATION: 'expired',
    BILLING_ISSUE: 'grace_period',
  };

  const newStatus = eventStatusMap[eventType];
  if (!newStatus) {
    console.log(`[iap-webhook] Unhandled event type: ${eventType} — ignoring`);
    return res.status(200).json({ received: true });
  }

  let family;
  try {
    const result = await db.query(
      'SELECT id, is_lifetime_free, subscription_status, rc_customer_id FROM family WHERE id = $1',
      [appUserId]
    );
    family = result.rows[0] ?? null;
  } catch (err) {
    console.error('[iap-webhook] DB error looking up family:', err.message);
    return res.status(200).json({ received: true });
  }

  if (!family) {
    if (eventType !== 'INITIAL_PURCHASE' && eventType !== 'EXPIRATION') {
      const result = await db.query(
        'SELECT id, is_lifetime_free, subscription_status FROM family WHERE rc_customer_id = $1',
        [appUserId]
      );
      family = result.rows[0] ?? null;
    }
    if (!family) {
      console.warn(`[iap-webhook] Family not found for app_user_id: ${appUserId} — returning 200 (RevenueCat will retry)`);
      return res.status(200).json({ received: true });
    }
  }

  if (family.is_lifetime_free) {
    console.log(`[iap-webhook] Family ${family.id} is lifetime_free — skipping status update for ${eventType}`);
    return res.status(200).json({ received: true });
  }

  const updateFields = ['subscription_status = $1', 'updated_at = NOW()'];
  const params = [newStatus];

  if (eventType === 'INITIAL_PURCHASE') {
    updateFields.push('rc_customer_id = $2');
    params.push(appUserId);
  }

  params.push(family.id);
  const sql = `UPDATE family SET ${updateFields.join(', ')} WHERE id = $${params.length}`;
  try {
    await db.query(sql, params);
    console.log(`[iap-webhook] Family ${family.id} subscription_status → ${newStatus}`);
  } catch (err) {
    console.error('[iap-webhook] Failed to update family:', err.message);
    return res.status(200).json({ received: true });
  }

  res.status(200).json({ received: true });
}

module.exports = { handleIapWebhook };
