/** Public app store URLs for landing page injection */

const { APP_APPLICATION_ID } = require('./iap-product-contract');

const APPLE_APP_STORE_ID = process.env.APPLE_APP_STORE_ID || '6738260000';

function androidPackageName() {
  if (process.env.ANDROID_PACKAGE_NAME) return process.env.ANDROID_PACKAGE_NAME;
  return APP_APPLICATION_ID;
}

function getPlayStoreUrl() {
  return `https://play.google.com/store/apps/details?id=${androidPackageName()}`;
}

function getAppleAppStoreUrl() {
  return `https://apps.apple.com/app/id${APPLE_APP_STORE_ID}`;
}

module.exports = {
  getPlayStoreUrl,
  getAppleAppStoreUrl,
  androidPackageName,
  APPLE_APP_STORE_ID,
};
