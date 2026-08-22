'use strict';

/**
 * Canonical entitlement keys — RevenueCat uses `basic`; user-facing label is Premium.
 */
const { ENTITLEMENT_ID } = require('./iap-product-contract');

const PREMIUM_ENTITLEMENT_KEY = ENTITLEMENT_ID; // 'basic'

const PREMIUM_SOURCES = Object.freeze([
  'grandfathered',
  'apple',
  'google',
  'gift',
  'admin',
  'none',
]);

const PREMIUM_STATUSES = Object.freeze([
  'grandfathered',
  'trial',
  'active',
  'grace_period',
  'gift',
  'expired',
  'none',
]);

/** V1 Premium bundle = core app access (basic_app). Add-on modules use separate keys later. */
const PREMIUM_V1_COMPONENTS = Object.freeze(['basic_app']);

module.exports = {
  PREMIUM_ENTITLEMENT_KEY,
  PREMIUM_SOURCES,
  PREMIUM_STATUSES,
  PREMIUM_V1_COMPONENTS,
};
