'use strict';

/**
 * Trusted IAP reconciliation — server derives store entitlement from RevenueCat API.
 * Client POST /api/iap/sync may only request reconciliation; it must not supply
 * authoritative subscription state.
 */
const db = require('./db');
const {
  fetchRevenueCatSubscriber,
  deriveSubscriptionStatusFromSubscriber,
  ENTITLEMENT_ID,
} = require('./revenuecat-subscriber-sync');
const {
  applyStoreEntitlementFromWebhook,
  resolveFamilyEntitlements,
} = require('./family-entitlements');
const { isAllowedProductId } = require('../../config/revenuecat-iap');

function pickSubscriptionProduct(subscriber) {
  const entitlements = subscriber?.entitlements || {};
  const entitlement = entitlements[ENTITLEMENT_ID];
  const subscriptions = subscriber?.subscriptions || {};

  if (entitlement?.product_identifier && isAllowedProductId(entitlement.product_identifier)) {
    const subscription = subscriptions[entitlement.product_identifier];
    if (subscription) {
      return {
        productId: entitlement.product_identifier,
        subscription,
        entitlement,
      };
    }
  }

  for (const [productId, subscription] of Object.entries(subscriptions)) {
    if (!subscription || !isAllowedProductId(productId)) continue;
    return { productId, subscription, entitlement: entitlement || null };
  }

  if (entitlement?.product_identifier && isAllowedProductId(entitlement.product_identifier)) {
    return {
      productId: entitlement.product_identifier,
      subscription: subscriptions[entitlement.product_identifier] || null,
      entitlement,
    };
  }

  return { productId: null, subscription: null, entitlement: entitlement || null };
}

/**
 * Map RevenueCat GET /subscribers payload to webhook-equivalent store params.
 * @param {object} subscriber
 * @param {number} [nowMs]
 */
function deriveStoreParamsFromSubscriber(subscriber, nowMs = Date.now()) {
  const subscriptionStatus = deriveSubscriptionStatusFromSubscriber(subscriber, nowMs);
  const { productId, subscription, entitlement } = pickSubscriptionProduct(subscriber);

  let expirationAtMs = null;
  if (entitlement?.expires_date) {
    expirationAtMs = Date.parse(entitlement.expires_date);
  } else if (subscription?.expires_date) {
    expirationAtMs = Date.parse(subscription.expires_date);
  }

  const event = {
    id: `rc_reconcile_${nowMs}`,
    store: subscription?.store || null,
    environment: subscription?.environment || subscriber?.environment || null,
    period_type: subscription?.period_type || entitlement?.period_type || null,
  };

  return {
    subscriptionStatus,
    eventType: 'RECONCILE',
    event,
    productId,
    expirationAtMs: Number.isFinite(expirationAtMs) ? expirationAtMs : null,
  };
}

function assertReconcileProductAllowed(subscriber, params) {
  if (params.subscriptionStatus === 'expired') return;

  const rawProductId = subscriber?.entitlements?.[ENTITLEMENT_ID]?.product_identifier;
  if (rawProductId && !isAllowedProductId(rawProductId)) {
    const err = new Error('RevenueCat subscriber product is not allowlisted for PAYMENTS V1');
    err.code = 'RC_PRODUCT_NOT_ALLOWED';
    throw err;
  }

  if (!params.productId || !isAllowedProductId(params.productId)) {
    const err = new Error('RevenueCat subscriber has no recognized store product');
    err.code = 'RC_NO_PRODUCT';
    throw err;
  }
}

/**
 * Fetch trusted RevenueCat state and apply canonical store entitlement.
 * @param {string} familyId
 * @param {{ fetchSubscriber?: Function, apiKey?: string|null }} [options]
 */
async function reconcileStoreEntitlementFromRevenueCat(familyId, options = {}) {
  const fetchSubscriber = options.fetchSubscriber || fetchRevenueCatSubscriber;
  const apiKey = options.apiKey !== undefined
    ? options.apiKey
    : (process.env.REVENUECAT_SECRET_API_KEY || process.env.REVENUECAT_API_KEY || null);

  if (!apiKey) {
    const err = new Error('RevenueCat verification unavailable');
    err.code = 'RC_NOT_CONFIGURED';
    throw err;
  }

  const { rows } = await db.query(
    'SELECT id, rc_customer_id FROM family WHERE id = $1',
    [familyId]
  );
  const familyRow = rows[0];
  if (!familyRow) {
    const err = new Error('Family not found');
    err.code = 'FAMILY_NOT_FOUND';
    throw err;
  }

  const appUserId = familyRow.rc_customer_id || familyId;
  let subscriber;
  try {
    subscriber = await fetchSubscriber(appUserId, { apiKey });
  } catch (err) {
    if (err.status === 404) {
      await applyStoreEntitlementFromWebhook(familyId, {
        subscriptionStatus: 'expired',
        eventType: 'RECONCILE',
        event: { id: `rc_reconcile_not_found_${Date.now()}`, store: null },
        productId: null,
        expirationAtMs: Date.now() - 1000,
      });
      return resolveFamilyEntitlements(familyId);
    }
    const wrapped = new Error(err.message || 'RevenueCat verification failed');
    wrapped.code = 'RC_VERIFY_FAILED';
    wrapped.status = err.status;
    throw wrapped;
  }

  if (!subscriber) {
    const err = new Error('RevenueCat returned no subscriber payload');
    err.code = 'RC_NO_SUBSCRIBER';
    throw err;
  }

  const params = deriveStoreParamsFromSubscriber(subscriber);
  assertReconcileProductAllowed(subscriber, params);

  await applyStoreEntitlementFromWebhook(familyId, params);
  return resolveFamilyEntitlements(familyId);
}

module.exports = {
  deriveStoreParamsFromSubscriber,
  reconcileStoreEntitlementFromRevenueCat,
};
