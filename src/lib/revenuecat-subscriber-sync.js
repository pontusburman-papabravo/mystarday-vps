'use strict';

const ENTITLEMENT_ID = process.env.REVENUECAT_ENTITLEMENT_ID || 'basic';

/**
 * Map RevenueCat GET /subscribers response to family.subscription_status.
 * @see https://www.revenuecat.com/docs/api-v1#tag/customers
 */
function deriveSubscriptionStatusFromSubscriber(subscriber, nowMs = Date.now()) {
  const entitlements = subscriber?.entitlements || {};
  const entitlement = entitlements[ENTITLEMENT_ID];
  const subscriptions = subscriber?.subscriptions || {};

  if (entitlement) {
    const expiresMs = entitlement.expires_date
      ? Date.parse(entitlement.expires_date)
      : null;
    if (!expiresMs || expiresMs > nowMs) {
      const productId = entitlement.product_identifier;
      const sub = productId ? subscriptions[productId] : null;
      if (sub?.billing_issues_detected_at) {
        return 'grace_period';
      }
      return 'active';
    }
  }

  for (const sub of Object.values(subscriptions)) {
    if (!sub) continue;
    if (sub.billing_issues_detected_at) {
      const expiresMs = sub.expires_date ? Date.parse(sub.expires_date) : null;
      if (!expiresMs || expiresMs > nowMs) {
        return 'grace_period';
      }
    }
  }

  return 'expired';
}

async function fetchRevenueCatSubscriber(appUserId, options = {}) {
  const apiKey = options.apiKey
    ?? process.env.REVENUECAT_SECRET_API_KEY
    ?? process.env.REVENUECAT_API_KEY;
  if (!apiKey) {
    throw new Error('REVENUECAT_SECRET_API_KEY (or REVENUECAT_API_KEY) is required');
  }

  const url = `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`RevenueCat API ${res.status}: ${text.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }

  const body = await res.json();
  return body?.subscriber || null;
}

module.exports = {
  ENTITLEMENT_ID,
  deriveSubscriptionStatusFromSubscriber,
  fetchRevenueCatSubscriber,
};
