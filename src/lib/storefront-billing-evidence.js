'use strict';

/**
 * Classify public storefront evidence. Does not call stores.
 * App download price and IAP prices are different facts — never conflate them.
 */

const EVIDENCE = Object.freeze({
  VERIFIED_EXTERNALLY: 'VERIFIED EXTERNALLY',
  VERIFIED_INTERNALLY: 'VERIFIED INTERNALLY',
  CONFIGURED: 'CONFIGURED',
  NOT_VERIFIED: 'NOT VERIFIED',
  BLOCKED: 'BLOCKED',
});

/**
 * iTunes Search API lookup `results[]` item is the software listing, not IAP.
 * @param {object} result
 */
function classifyItunesSoftwareListing(result) {
  if (!result || result.kind !== 'software') {
    return { kind: null, isAppDownload: false, price: null, currency: null };
  }
  return {
    kind: 'software',
    isAppDownload: true,
    isIap: false,
    trackId: result.trackId || null,
    price: typeof result.price === 'number' ? result.price : null,
    formattedPrice: result.formattedPrice || null,
    currency: result.currency || null,
    isPaidDownload: typeof result.price === 'number' && result.price > 0,
  };
}

/**
 * Apple product-page offerDisplayProperties for the app itself.
 * @param {object} offer
 */
function classifyAppleAppOffer(offer) {
  if (!offer || offer.offerType !== 'app') {
    return { isAppOffer: false };
  }
  return {
    isAppOffer: true,
    isIap: false,
    isFree: offer.isFree === true,
    hasInAppPurchases: offer.hasInAppPurchases === true,
    priceFormatted: offer.priceFormatted || offer.titles?.standard || null,
    isPaidDownload: offer.isFree === false,
  };
}

/**
 * Google Play listing IAP range, e.g. "€5.99 - €59.00 if billed through Play".
 * Range endpoints are not named monthly/annual SKUs.
 * @param {string} raw
 */
function classifyPlayIapRange(raw) {
  const text = String(raw || '');
  const billed = /if billed through Play/i.test(text);
  const match = text.match(
    /([€£$]|kr)?\s*([0-9]+(?:[.,][0-9]+)?)\s*(kr|€)?\s*[-–]\s*([€£$]|kr)?\s*([0-9]+(?:[.,][0-9]+)?)\s*(kr|€)?/i
  );
  if (!billed || !match) {
    return { isIapRange: false, low: null, high: null };
  }
  const low = Number(String(match[2]).replace(',', '.'));
  const high = Number(String(match[5]).replace(',', '.'));
  return {
    isIapRange: true,
    isAppDownload: false,
    raw: text,
    low: Number.isFinite(low) ? low : null,
    high: Number.isFinite(high) ? high : null,
    namedMonthlySku: false,
    namedAnnualSku: false,
  };
}

function paidAppDownloadIsCommercialBlocker(listing) {
  return Boolean(listing && listing.isPaidDownload);
}

module.exports = {
  EVIDENCE,
  classifyItunesSoftwareListing,
  classifyAppleAppOffer,
  classifyPlayIapRange,
  paidAppDownloadIsCommercialBlocker,
};
