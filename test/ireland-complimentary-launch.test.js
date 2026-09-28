'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  describeIrelandLaunchOffer,
  isIrelandComplimentaryActive,
  DEFAULT_IRELAND_FREE_UNTIL,
} = require('../src/lib/ireland-launch-offer');
const { getMarketCommercialPolicy, ENTITLEMENT } = require('../src/lib/market-commercial-policy');
const { evaluateSignupCompleteness } = require('../src/lib/market-launch-invariants');
const { evaluateMarketPurchaseAllowed } = require('../src/lib/payment-settings');
const { GATE_DEFAULTS } = require('../src/lib/market-region');
const { ENGLISH_PUBLIC_SITE_URL } = require('../src/lib/public-html-placeholders');
const { APPLE_APP_STORE_IE_URL, getIrelandPlayStoreUrl, getPlayStoreUrl } = require('../config/store-links');

const ROOT = path.join(__dirname, '..');
const CUTOFF = new Date(DEFAULT_IRELAND_FREE_UNTIL);
const BEFORE = new Date(CUTOFF.getTime() - 1000);
const PROMO = 'Visual routines for children who need more structure — especially helpful for ADHD and autism. Free in Ireland until 31 December. No card required.';
const PLAY_SHORT = 'Visual routines for kids who need more structure, with stars and rewards.';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function enUrlRe(suffix = '') {
  return new RegExp(ENGLISH_PUBLIC_SITE_URL.replace(/[.]/g, '\\.') + suffix);
}

describe('Ireland complimentary access window', () => {
  it('is active for IE before the Dublin cutoff and gone at the cutoff', () => {
    assert.equal(DEFAULT_IRELAND_FREE_UNTIL, '2027-01-01T00:00:00.000Z');
    assert.equal(isIrelandComplimentaryActive({ countryCode: 'IE', now: BEFORE }), true);
    assert.equal(isIrelandComplimentaryActive({
      countryCode: 'IE',
      now: new Date('2026-12-31T23:59:59.000Z'),
    }), true);
    assert.equal(isIrelandComplimentaryActive({ countryCode: 'IE', now: CUTOFF }), false);
    assert.equal(isIrelandComplimentaryActive({ countryCode: 'SE', now: BEFORE }), false);
    assert.equal(isIrelandComplimentaryActive({ countryCode: 'FI', now: BEFORE }), false);
    assert.equal(isIrelandComplimentaryActive({ countryCode: 'GB', now: BEFORE }), false);
  });

  it('does not create a paid entitlement or require a payment method', () => {
    const offer = describeIrelandLaunchOffer(DEFAULT_IRELAND_FREE_UNTIL, BEFORE);
    assert.deepEqual(offer, {
      kind: 'complimentary_until',
      ends_at: '2027-01-01T00:00:00.000Z',
      payment_method_required: false,
      auto_converts: false,
      active: true,
    });
    assert.equal(describeIrelandLaunchOffer(DEFAULT_IRELAND_FREE_UNTIL, CUTOFF).active, false);
    const src = read('src/lib/family-entitlements.js');
    assert.match(src, /buildComplimentaryPremium/);
    assert.doesNotMatch(src, /upsertComplimentary|source: 'apple'[\s\S]{0,80}complimentary/);
  });

  it('keeps Sweden intro-year and leaves Finland and the UK closed', () => {
    assert.equal(getMarketCommercialPolicy('SE').entitlement, ENTITLEMENT.INTRO_YEAR);
    assert.equal(getMarketCommercialPolicy('FI').entitlement, ENTITLEMENT.TRIAL);
    assert.equal(getMarketCommercialPolicy('GB').entitlement, ENTITLEMENT.TRIAL);
    assert.equal(GATE_DEFAULTS.market_ie_open, false);
    assert.equal(GATE_DEFAULTS.market_fi_open, false);
    assert.equal(GATE_DEFAULTS.market_uk_open, false);
    assert.equal(GATE_DEFAULTS.market_se_open, true);
    const fi = evaluateSignupCompleteness({
      countryCode: 'FI',
      marketOpen: false,
      publicBillingUsable: true,
      now: BEFORE,
    });
    const gb = evaluateSignupCompleteness({
      countryCode: 'GB',
      marketOpen: false,
      publicBillingUsable: true,
      now: BEFORE,
    });
    assert.equal(fi.code, 'MARKET_FI_CLOSED');
    assert.equal(gb.code, 'MARKET_UK_CLOSED');
  });

  it('lets ordinary IE families wait, and App Review still has an explicit purchase path', () => {
    assert.equal(evaluateMarketPurchaseAllowed({
      countryCode: 'IE',
      now: BEFORE,
      irelandFreeUntil: CUTOFF,
    }), false);
    assert.equal(evaluateMarketPurchaseAllowed({
      countryCode: 'IE',
      now: CUTOFF,
      irelandFreeUntil: CUTOFF,
    }), true);
    assert.equal(evaluateMarketPurchaseAllowed({
      countryCode: 'SE',
      now: new Date('2026-10-02T00:00:00+02:00'),
      paymentStartAt: new Date('2026-10-01T00:00:00+02:00'),
    }), true);
    const gate = read('src/lib/iap-native-purchase-gate.js');
    assert.match(gate, /reason: 'sandbox_family'/);
    const purchase = gate.slice(gate.indexOf('async function getNativePurchaseEligibility'));
    const restore = gate.slice(
      gate.indexOf('async function getNativeRestoreEligibility'),
      gate.indexOf('async function getNativePurchaseEligibility')
    );
    assert.match(purchase, /isMarketPurchaseAllowed/);
    assert.doesNotMatch(restore, /isMarketPurchaseAllowed/);
  });

  it('exposes the launch offer from the registration-gates route', () => {
    const route = read('src/routes/market.js');
    assert.match(route, /launch_offer/);
    assert.match(route, /describeIrelandLaunchOffer/);
  });
});

describe('English Ireland store and canonical surfaces', () => {
  const pages = [
    'public/en.html',
    'public/en-pricing.html',
    'public/en-faq.html',
    'public/en-how-it-works.html',
    'public/en-contact.html',
    'public/en-privacy.html',
    'public/en-terms.html',
  ];

  it('English marketing pages use the Ireland storefront and never the geo-neutral App Store URL', () => {
    assert.equal(APPLE_APP_STORE_IE_URL, 'https://apps.apple.com/ie/app/my-starday-family-routines/id6774493098');
    assert.match(getIrelandPlayStoreUrl(), /hl=en&gl=IE$/);
    assert.doesNotMatch(getPlayStoreUrl(), /hl=en/);
    const storePages = ['public/en.html', 'public/en-pricing.html', 'public/en-faq.html'];
    for (const rel of storePages) {
      const html = read(rel);
      assert.match(html, /apps\.apple\.com\/ie\/app\/my-starday-family-routines\/id6774493098/, rel);
      assert.match(html, /hl=en&(?:amp;)?gl=IE/, rel);
    }
    for (const rel of pages.concat(storePages)) {
      const html = read(rel);
      assert.doesNotMatch(html, /https:\/\/apps\.apple\.com\/app\/id6774493098/, rel);
      assert.match(html, enUrlRe('/en'), rel);
    }
  });

  it('FAQ JSON-LD and pricing no longer say 14 days free', () => {
    const faq = read('public/en-faq.html');
    const pricing = read('public/en-pricing.html');
    const jsonLd = faq.slice(faq.indexOf('application/ld+json'), faq.indexOf('</script>'));
    assert.match(jsonLd, /Free in Ireland until 31 December 2026/);
    assert.doesNotMatch(jsonLd, /14 days free/i);
    assert.doesNotMatch(jsonLd, /14-day trial/i);
    assert.doesNotMatch(pricing, /14 days free/i);
    assert.doesNotMatch(pricing, /14-day trial/i);
    assert.match(pricing, /does not automatically/);
  });

  it('keeps the English canonical host on the English public origin', () => {
    assert.equal(ENGLISH_PUBLIC_SITE_URL, ['https://', 'mys', 'tar', 'day', '.app'].join(''));
    const sitemap = read('src/lib/sitemap.js');
    assert.match(sitemap, /ENGLISH_PUBLIC_SITE_URL/);
  });

  it('keeps promotional text and Play short description inside store limits', () => {
    assert.ok(PROMO.length <= 170, `promo is ${PROMO.length}`);
    assert.equal(PROMO.length, 147);
    assert.ok(PLAY_SHORT.length <= 80, `short is ${PLAY_SHORT.length}`);
    assert.equal(PLAY_SHORT.length, 73);
    const apple = read('docs/app-store-connect-metadata-en-GB.md');
    const play = read('docs/google-play-metadata-en-GB.md');
    assert.match(apple, /My Starday: Family Routines/);
    assert.match(apple, /Visual routines for families/);
    assert.ok(apple.includes(PROMO), 'promotional text missing from App Store metadata');
    assert.match(apple, /https:\/\/www\.apple\.com\/legal\/internet-services\/itunes\/dev\/stdeula\//);
    assert.match(apple, enUrlRe('/en'));
    assert.match(apple, enUrlRe('/en/privacy'));
    assert.match(apple, enUrlRe('/en/contact'));
    assert.ok(play.includes(PLAY_SHORT), 'Play short description missing');
    assert.match(play, /versionCode 15 \/ versionName 1\.4\.6/);
    assert.doesNotMatch(apple, /Sweden only/i);
    assert.doesNotMatch(play, /Sweden only/i);
    assert.doesNotMatch(play, /English Beta \(Sweden\)/);
    assert.doesNotMatch(apple, /English Beta \(Sweden\)/);
  });

  it('has no Ireland-specific Sweden-only strings on the English public pages', () => {
    for (const rel of pages) {
      const html = read(rel);
      assert.doesNotMatch(html, /Sweden only/i, rel);
      assert.doesNotMatch(html, /English Beta \(Sweden\)/, rel);
      assert.doesNotMatch(html, /14 days free/i, rel);
    }
  });
});
