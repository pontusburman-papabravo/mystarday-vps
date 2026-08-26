/** Public app store URLs for landing page injection */

const { APP_APPLICATION_ID } = require('./iap-product-contract');

/**
 * Live App Store short link (also used by public/js/landing-login-choice.js).
 * Only override with APPLE_APP_STORE_ID when a verified numeric App Store id
 * is available — an unverified numeric id can 404 ("App ej tillgänglig").
 */
const APPLE_APP_STORE_SHORT_URL = 'https://apple.co/4v2ESuH';
const APPLE_APP_STORE_ID = process.env.APPLE_APP_STORE_ID || '';

function androidPackageName() {
  if (process.env.ANDROID_PACKAGE_NAME) return process.env.ANDROID_PACKAGE_NAME;
  return APP_APPLICATION_ID;
}

function getPlayStoreUrl() {
  return `https://play.google.com/store/apps/details?id=${androidPackageName()}`;
}

function getAppleAppStoreUrl() {
  if (APPLE_APP_STORE_ID) return `https://apps.apple.com/app/id${APPLE_APP_STORE_ID}`;
  return APPLE_APP_STORE_SHORT_URL;
}

module.exports = {
  getPlayStoreUrl,
  getAppleAppStoreUrl,
  androidPackageName,
  APPLE_APP_STORE_ID,
  APPLE_APP_STORE_SHORT_URL,
};
