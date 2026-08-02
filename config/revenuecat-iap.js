'use strict';

/**
 * RevenueCat IAP validation config (webhook + client SDK).
 * Secrets stay in env; this module only holds allowlists and helpers.
 */

const DEFAULT_PRODUCT_ID = 'rc_basic_monthly';
const DEFAULT_ENTITLEMENT_ID = 'basic';

function parseCsvEnv(name) {
  const raw = process.env[name];
  if (!raw || !String(raw).trim()) return [];
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function getAllowedProductIds() {
  const fromEnv = parseCsvEnv('REVENUECAT_ALLOWED_PRODUCT_IDS');
  if (fromEnv.length > 0) return fromEnv;
  return [DEFAULT_PRODUCT_ID];
}

function getAllowedAppIds() {
  return parseCsvEnv('REVENUECAT_ALLOWED_APP_IDS');
}

function getEntitlementId() {
  return process.env.REVENUECAT_ENTITLEMENT_ID || DEFAULT_ENTITLEMENT_ID;
}

/** Products that grant subscription access via NON_RENEWING_PURCHASE. */
function getNonRenewingSubscriptionProductIds() {
  const fromEnv = parseCsvEnv('REVENUECAT_NON_RENEWING_SUBSCRIPTION_PRODUCT_IDS');
  return new Set(fromEnv);
}

function getSandboxTestFamilyIds() {
  return new Set(parseCsvEnv('REVENUECAT_SANDBOX_FAMILY_IDS'));
}

function isSandboxTestFamily(familyId) {
  const allow = getSandboxTestFamilyIds();
  if (allow.has('*')) return true;
  return allow.has(String(familyId));
}

function isAllowedProductId(productId) {
  if (!productId) return false;
  return getAllowedProductIds().includes(String(productId));
}

function isAllowedAppId(appId) {
  const allowed = getAllowedAppIds();
  if (allowed.length === 0) return true;
  if (!appId) return false;
  return allowed.includes(String(appId));
}

function eventHasEntitlement(event, entitlementId = getEntitlementId()) {
  const ids = event?.entitlement_ids;
  if (!Array.isArray(ids)) return true;
  if (ids.length === 0) return true;
  return ids.includes(entitlementId);
}

function isSecretSdkKey(value) {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.startsWith('sk_') || trimmed.startsWith('rcsk_');
}

function getPublicSdkKeyForPlatform(platform) {
  if (platform === 'ios') {
    return process.env.REVENUECAT_IOS_PUBLIC_SDK_KEY
      || process.env.REVENUECAT_APPLE_PUBLIC_SDK_KEY
      || null;
  }
  if (platform === 'android') {
    return process.env.REVENUECAT_ANDROID_PUBLIC_SDK_KEY
      || process.env.REVENUECAT_GOOGLE_PUBLIC_SDK_KEY
      || null;
  }
  return null;
}

/** Legacy env name — must not be a secret key when exposed via /api/iap/config */
function getLegacyPublicApiKey() {
  const key = process.env.REVENUECAT_API_KEY;
  if (!key) return null;
  if (isSecretSdkKey(key)) return null;
  return key;
}

module.exports = {
  DEFAULT_PRODUCT_ID,
  DEFAULT_ENTITLEMENT_ID,
  getAllowedProductIds,
  getAllowedAppIds,
  getEntitlementId,
  getNonRenewingSubscriptionProductIds,
  getSandboxTestFamilyIds,
  isSandboxTestFamily,
  isAllowedProductId,
  isAllowedAppId,
  eventHasEntitlement,
  isSecretSdkKey,
  getPublicSdkKeyForPlatform,
  getLegacyPublicApiKey,
};
