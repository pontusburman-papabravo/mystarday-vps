/**
 * In-App Purchase routes — RevenueCat SDK config and webhook handler.
 *
 * WHAT: serves RevenueCat API key to native clients (GET /config), and
 * receives webhook events to keep subscription_status in sync (POST /webhook).
 *
 * WHAT NOT: does NOT serve payment UI or initiate purchases. Does NOT apply
 * CSRF protection (external webhook — no browser session).
 */

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const db = require('../lib/db');

// ── GET /api/iap/config ──────────────────────────────────────────────────────
// RevenueCat config for native clients. API key is a public key, safe in bundle.
router.get('/config', requireAuth, (req, res) => {
  res.json({
    apiKey: process.env.REVENUECAT_API_KEY || null,
    productId: 'se.mystarday.app.basic',
    entitlementId: 'basic',
  });
});

// ── POST /api/iap/webhook ───────────────────────────────────────────────────
// Mounted in app.js BEFORE express.json() (raw body for HMAC verification).
// CSRF: bypassed — registered before csrfProtect (external API, not a browser form).

async function handleIapWebhook(req, res) {
  // ── 1. Verify Authorization header ──────────────────────────────────────
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

  // RevenueCat sends: Authorization: Bearer <api_key>:<base64_hmac_sha256>
  // We verify by computing HMAC-SHA256(body, secret) and comparing the base64 sig.
  const parts = authHeader.split(':');
  if (parts.length < 2) {
    console.error('[iap-webhook] Malformed Authorization header');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const providedSig = parts.slice(1).join(':'); // base64 signature
  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(req.body)
    .digest('base64');

  if (!crypto.timingSafeEqual(Buffer.from(providedSig), Buffer.from(expectedSig))) {
    console.error('[iap-webhook] Signature mismatch');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // ── 2. Parse payload ──────────────────────────────────────────────────────
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
    return res.status(200).json({ received: true }); // RevenueCat retry policy
  }
  if (!appUserId) {
    console.warn('[iap-webhook] Missing app_user_id in payload');
    return res.status(200).json({ received: true });
  }

  console.log(`[iap-webhook] Received event: ${eventType} for app_user_id: ${appUserId}`);

  // ── 3. Map event type → subscription_status ───────────────────────────────
  const eventStatusMap = {
    INITIAL_PURCHASE:  'active',
    RENEWAL:           'active',
    CANCELLATION:      'cancelled',
    EXPIRATION:        'expired',
    BILLING_ISSUE:     'grace_period',
  };

  const newStatus = eventStatusMap[eventType];
  if (!newStatus) {
    console.log(`[iap-webhook] Unhandled event type: ${eventType} — ignoring`);
    return res.status(200).json({ received: true });
  }

  // ── 4. Find family by app_user_id (family UUID) ───────────────────────────
  let family;
  try {
    const result = await db.query(
      'SELECT id, is_lifetime_free, subscription_status, rc_customer_id FROM family WHERE id = $1',
      [appUserId]
    );
    family = result.rows[0] ?? null;
  } catch (err) {
    console.error('[iap-webhook] DB error looking up family:', err.message);
    return res.status(200).json({ received: true }); // soft error — RevenueCat will retry
  }

  if (!family) {
    // Try by rc_customer_id as fallback for non-initial-purchase events
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

  // ── 5. Lifetime-free guard ────────────────────────────────────────────────
  if (family.is_lifetime_free) {
    console.log(`[iap-webhook] Family ${family.id} is lifetime_free — skipping status update for ${eventType}`);
    return res.status(200).json({ received: true });
  }

  // ── 6. Update subscription_status ────────────────────────────────────────
  const updateFields = ['subscription_status = $1', 'updated_at = NOW()'];
  const params = [newStatus];

  // On INITIAL_PURCHASE also save rc_customer_id
  if (eventType === 'INITIAL_PURCHASE') {
    updateFields.push('rc_customer_id = $2');
    params.push(appUserId);
  }

  const sql = `UPDATE family SET ${updateFields.join(', ')} WHERE id = $${params.length}`;
  try {
    await db.query(sql, params);
    console.log(`[iap-webhook] Family ${family.id} subscription_status → ${newStatus}`);
  } catch (err) {
    console.error('[iap-webhook] Failed to update family:', err.message);
    return res.status(200).json({ received: true }); // soft error
  }

  res.status(200).json({ received: true });
}

module.exports = router;
module.exports.handleIapWebhook = handleIapWebhook;