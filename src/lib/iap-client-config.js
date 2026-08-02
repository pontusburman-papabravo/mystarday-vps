'use strict';

const {
  isSecretSdkKey,
  getPublicSdkKeyForPlatform,
  getLegacyPublicApiKey,
  getEntitlementId,
  DEFAULT_PRODUCT_ID,
} = require('../../config/revenuecat-iap');

function validateRevenueCatClientKeysAtStartup() {
  const offenders = [];
  const check = (name, value) => {
    if (value && isSecretSdkKey(value)) {
      offenders.push(name);
    }
  };

  check('REVENUECAT_API_KEY', process.env.REVENUECAT_API_KEY);
  check('REVENUECAT_IOS_PUBLIC_SDK_KEY', process.env.REVENUECAT_IOS_PUBLIC_SDK_KEY);
  check('REVENUECAT_ANDROID_PUBLIC_SDK_KEY', process.env.REVENUECAT_ANDROID_PUBLIC_SDK_KEY);
  check('REVENUECAT_APPLE_PUBLIC_SDK_KEY', process.env.REVENUECAT_APPLE_PUBLIC_SDK_KEY);
  check('REVENUECAT_GOOGLE_PUBLIC_SDK_KEY', process.env.REVENUECAT_GOOGLE_PUBLIC_SDK_KEY);

  if (offenders.length > 0) {
    console.error(
      '[iap-config] FATAL: secret RevenueCat key configured as client key:',
      offenders.join(', ')
    );
    if (process.env.REVENUECAT_STRICT_CLIENT_KEYS === 'true') {
      throw new Error('REVENUECAT client keys must be public SDK keys, not sk_/rcsk_ secrets');
    }
  }
}

module.exports = {
  validateRevenueCatClientKeysAtStartup,
  isSecretSdkKey,
  getPublicSdkKeyForPlatform,
  getLegacyPublicApiKey,
  getEntitlementId,
  DEFAULT_PRODUCT_ID,
};
