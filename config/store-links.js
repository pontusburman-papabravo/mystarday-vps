/** Public app store URLs for landing page injection */

const { APP_APPLICATION_ID } = require('./iap-product-contract');

/**
 * Live App Store short link (also used by public/js/landing-login-choice.js).
 * Only override with APPLE_APP_STORE_ID when a verified numeric App Store id
 * is available — an unverified numeric id can 404 ("App ej tillgänglig").
 */
const APPLE_APP_STORE_SHORT_URL = 'https://apple.co/4v2ESuH';
/** Verified externally 2026-08-31 via iTunes lookup trackId (IE + FI listings). */
const APPLE_APP_STORE_TRACK_ID = '6774493098';
const APPLE_APP_STORE_ID = process.env.APPLE_APP_STORE_ID || APPLE_APP_STORE_TRACK_ID;
/** Storefront-neutral listing — Apple routes by the user's Apple ID country. Do not use the SE short link on English pages. */
const APPLE_APP_STORE_GEO_NEUTRAL_URL = `https://apps.apple.com/app/id${APPLE_APP_STORE_TRACK_ID}`;
/** Ireland storefront. Do not use the geo-neutral URL on English marketing pages. */
const APPLE_APP_STORE_IE_URL = `https://apps.apple.com/ie/app/my-starday-family-routines/id${APPLE_APP_STORE_TRACK_ID}`;

function androidPackageName() {
  if (process.env.ANDROID_PACKAGE_NAME) return process.env.ANDROID_PACKAGE_NAME;
  return APP_APPLICATION_ID;
}

function getPlayStoreUrl() {
  return `https://play.google.com/store/apps/details?id=${androidPackageName()}`;
}

/**
 * English/Ireland web listing. hl/gl set presentation and store context.
 * Install rights still follow the Google account's storefront and track country.
 */
function getIrelandPlayStoreUrl() {
  return `https://play.google.com/store/apps/details?id=${androidPackageName()}&hl=en&gl=IE`;
}

function injectStoreLinkPlaceholders(html, { ireland = false } = {}) {
  const play = ireland ? getIrelandPlayStoreUrl() : getPlayStoreUrl();
  let out = String(html || '')
    .replace(/__PLAY_STORE_URL_IE__/g, getIrelandPlayStoreUrl())
    .replace(/__APPLE_STORE_URL_IE__/g, APPLE_APP_STORE_IE_URL)
    .replace(/__PLAY_STORE_URL__/g, play)
    .replace(/__APPLE_STORE_URL__/g, ireland ? APPLE_APP_STORE_IE_URL : APPLE_APP_STORE_SHORT_URL);
  if (ireland) {
    out = out.split(APPLE_APP_STORE_GEO_NEUTRAL_URL).join(APPLE_APP_STORE_IE_URL);
  }
  return out;
}

function getAppleAppStoreUrl() {
  if (APPLE_APP_STORE_ID) return `https://apps.apple.com/app/id${APPLE_APP_STORE_ID}`;
  return APPLE_APP_STORE_GEO_NEUTRAL_URL;
}

module.exports = {
  getPlayStoreUrl,
  getIrelandPlayStoreUrl,
  getAppleAppStoreUrl,
  injectStoreLinkPlaceholders,
  androidPackageName,
  APPLE_APP_STORE_ID,
  APPLE_APP_STORE_SHORT_URL,
  APPLE_APP_STORE_GEO_NEUTRAL_URL,
  APPLE_APP_STORE_IE_URL,
  APPLE_APP_STORE_TRACK_ID,
};
