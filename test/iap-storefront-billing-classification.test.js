'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  classifyItunesSoftwareListing,
  classifyAppleAppOffer,
  classifyPlayIapRange,
  paidAppDownloadIsCommercialBlocker,
} = require('../src/lib/storefront-billing-evidence');

describe('storefront billing classification — never treat app price as IAP', () => {
  it('iTunes IE software listing €5.99 is APP download, not monthly IAP', () => {
    const listing = classifyItunesSoftwareListing({
      kind: 'software',
      trackId: 6774493098,
      price: 5.99,
      formattedPrice: '€5.99',
      currency: 'EUR',
    });
    assert.equal(listing.isAppDownload, true);
    assert.equal(listing.isIap, false);
    assert.equal(listing.isPaidDownload, true);
    assert.equal(paidAppDownloadIsCommercialBlocker(listing), true);
  });

  it('iTunes FI software listing is APP download', () => {
    const listing = classifyItunesSoftwareListing({
      kind: 'software',
      trackId: 6774493098,
      price: 5.99,
      formattedPrice: '5,99 €',
      currency: 'EUR',
    });
    assert.equal(listing.isAppDownload, true);
    assert.equal(listing.isIap, false);
  });

  it('Apple product-page offer for this app is paid with no IAP shelf', () => {
    const offer = classifyAppleAppOffer({
      offerType: 'app',
      isFree: false,
      hasInAppPurchases: false,
      priceFormatted: '€5.99',
    });
    assert.equal(offer.isAppOffer, true);
    assert.equal(offer.isIap, false);
    assert.equal(offer.hasInAppPurchases, false);
    assert.equal(offer.isPaidDownload, true);
  });

  it('Play IE range is IAP range endpoints, not named monthly/annual SKUs', () => {
    const range = classifyPlayIapRange('€5.99 - €59.00 if billed through Play');
    assert.equal(range.isIapRange, true);
    assert.equal(range.isAppDownload, false);
    assert.equal(range.low, 5.99);
    assert.equal(range.high, 59);
    assert.equal(range.namedMonthlySku, false);
    assert.equal(range.namedAnnualSku, false);
  });

  it('Play FI range keeps the storefront-specific low endpoint', () => {
    const range = classifyPlayIapRange('€5.90 - €59.00 if billed through Play');
    assert.equal(range.isIapRange, true);
    assert.equal(range.low, 5.9);
    assert.equal(range.high, 59);
  });
});
