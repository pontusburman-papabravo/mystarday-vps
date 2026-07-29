/**
 * RevenueCat webhook authentication.
 * @see https://www.revenuecat.com/docs/integrations/webhooks
 * - Static Authorization header (dashboard-configured value)
 * - Optional X-RevenueCat-Webhook-Signature HMAC over "{t}.{raw_body}"
 */
'use strict';

const crypto = require('crypto');

const HMAC_TOLERANCE_SEC = 300;

function timingSafeEqualStrings(a, b) {
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * Compare the configured static Authorization header value from RevenueCat.
 * The dashboard sends the exact string configured — no HMAC over the body.
 */
function verifyStaticAuthorization(authHeader, expectedSecret) {
  if (!authHeader || !expectedSecret) {
    return false;
  }
  return timingSafeEqualStrings(authHeader.trim(), expectedSecret.trim());
}

/**
 * Verify X-RevenueCat-Webhook-Signature: t=<unix>,v1=<hmac_sha256_hex>
 * HMAC is over "{timestamp}.{raw_body}" per RevenueCat docs.
 */
function verifyWebhookSignature(bodyBuffer, signatureHeader, signingSecret) {
  if (!signatureHeader || !signingSecret || !Buffer.isBuffer(bodyBuffer)) {
    return false;
  }

  const parts = {};
  for (const segment of String(signatureHeader).split(',')) {
    const eq = segment.indexOf('=');
    if (eq === -1) continue;
    parts[segment.slice(0, eq).trim()] = segment.slice(eq + 1).trim();
  }

  const timestamp = parts.t;
  const expectedSig = parts.v1;
  if (!timestamp || !expectedSig) {
    return false;
  }

  const ts = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) {
    return false;
  }
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > HMAC_TOLERANCE_SEC) {
    return false;
  }

  const signedPayload = Buffer.concat([Buffer.from(`${timestamp}.`, 'utf8'), bodyBuffer]);
  const computed = crypto
    .createHmac('sha256', signingSecret)
    .update(signedPayload)
    .digest('hex');

  return timingSafeEqualStrings(computed, expectedSig);
}

/**
 * Authenticate a RevenueCat webhook request.
 * Prefers HMAC when X-RevenueCat-Webhook-Signature is present and signing secret is set.
 * Otherwise validates the static Authorization header against REVENUECAT_WEBHOOK_SECRET.
 */
function authenticateRevenueCatWebhook(req, bodyBuffer, options = {}) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  const signatureHeader = req.headers['x-revenuecat-webhook-signature']
    || req.headers['X-RevenueCat-Webhook-Signature']
    || '';

  const staticSecret = options.staticSecret ?? process.env.REVENUECAT_WEBHOOK_SECRET;
  const signingSecret = options.signingSecret ?? process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET;

  if (signatureHeader && signingSecret) {
    return verifyWebhookSignature(bodyBuffer, signatureHeader, signingSecret);
  }

  if (staticSecret && authHeader) {
    return verifyStaticAuthorization(authHeader, staticSecret);
  }

  return false;
}

module.exports = {
  authenticateRevenueCatWebhook,
  verifyStaticAuthorization,
  verifyWebhookSignature,
  HMAC_TOLERANCE_SEC,
};
