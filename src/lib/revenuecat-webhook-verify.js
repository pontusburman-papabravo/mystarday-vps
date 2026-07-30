/**
 * RevenueCat webhook authentication.
 * @see https://www.revenuecat.com/docs/integrations/webhooks
 * - Static Authorization header (dashboard-configured value)
 * - Optional X-RevenueCat-Webhook-Signature HMAC over "{t}.{raw_body}"
 *
 * REVENUECAT_WEBHOOK_AUTH_MODE:
 * - static — Authorization header only
 * - hmac   — X-RevenueCat-Webhook-Signature only
 * - both   — require both (no downgrade when both secrets are configured)
 * Default when unset: both if both secrets exist, else the configured method.
 */
'use strict';

const crypto = require('crypto');

const HMAC_TOLERANCE_SEC = 300;
const AUTH_MODES = new Set(['static', 'hmac', 'both']);

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

function resolveAuthMode(options = {}) {
  const explicit = String(
    options.authMode ?? process.env.REVENUECAT_WEBHOOK_AUTH_MODE ?? ''
  ).trim().toLowerCase();
  if (AUTH_MODES.has(explicit)) {
    return explicit;
  }

  const staticSecret = options.staticSecret ?? process.env.REVENUECAT_WEBHOOK_SECRET;
  const signingSecret = options.signingSecret ?? process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET;
  if (staticSecret && signingSecret) return 'both';
  if (signingSecret) return 'hmac';
  return 'static';
}

/**
 * Authenticate a RevenueCat webhook request.
 */
function authenticateRevenueCatWebhook(req, bodyBuffer, options = {}) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  const signatureHeader = req.headers['x-revenuecat-webhook-signature']
    || req.headers['X-RevenueCat-Webhook-Signature']
    || '';

  const staticSecret = options.staticSecret ?? process.env.REVENUECAT_WEBHOOK_SECRET;
  const signingSecret = options.signingSecret ?? process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET;
  const mode = resolveAuthMode(options);

  const staticOk = Boolean(staticSecret && authHeader
    && verifyStaticAuthorization(authHeader, staticSecret));
  const hmacOk = Boolean(signingSecret && signatureHeader
    && verifyWebhookSignature(bodyBuffer, signatureHeader, signingSecret));

  switch (mode) {
    case 'static':
      return staticOk;
    case 'hmac':
      return hmacOk;
    case 'both':
      return staticOk && hmacOk;
    default:
      return false;
  }
}

module.exports = {
  authenticateRevenueCatWebhook,
  verifyStaticAuthorization,
  verifyWebhookSignature,
  resolveAuthMode,
  HMAC_TOLERANCE_SEC,
  AUTH_MODES,
};
