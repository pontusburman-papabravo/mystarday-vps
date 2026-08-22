'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const Logic = require('../public/js/iap-native-client-logic');

const ROOT = path.join(__dirname, '..');
const paywallJs = fs.readFileSync(path.join(ROOT, 'public/js/paywall.js'), 'utf8');
const paywallHtml = fs.readFileSync(path.join(ROOT, 'public/paywall.html'), 'utf8');

describe('paywall native subscription screen', () => {
  test('A: web mode hides native purchase UI and shows web notice', () => {
    assert.match(paywallJs, /function configureWebMode/);
    assert.match(paywallJs, /hide\(document\.getElementById\('paywallPlans'\)\)/);
    assert.match(paywallJs, /show\(document\.getElementById\('paywallWebNotice'\)\)/);
    assert.match(paywallJs, /hide\(document\.getElementById\('paywallNativeActions'\)\)/);
    assert.match(paywallJs, /if \(!isNative\(\)\)/);
    assert.match(paywallHtml, /id="paywallWebNotice"/);
    assert.match(paywallHtml, /id="paywallNativeActions"/);
  });

  test('B: native pricing requires IAPManager.canPurchase (fail-closed)', () => {
    assert.match(paywallJs, /if \(!IAPManager\.canPurchase\(\)\)/);
    assert.match(paywallJs, /setStatus\(t\('paywall\.statusUnavailable'\)/);
    assert.doesNotMatch(paywallJs, /localStorage/);
    assert.doesNotMatch(paywallJs, /magic|bypass|devButton/i);
  });

  test('C: native eligible path resolves monthly + yearly from offering', () => {
    assert.match(paywallJs, /Logic\.resolveOfferingTierDisplays/);
    assert.match(paywallJs, /renderTierPrices\(displays, config\)/);
    assert.match(paywallJs, /setPurchaseCtaEnabled\(true\)/);
    assert.match(paywallHtml, /id="planYearlyBtn"/);
    assert.match(paywallHtml, /id="planMonthlyBtn"/);
    assert.match(paywallHtml, /id="paywallPurchaseBtn"/);
  });

  test('D: exact package matching delegated to IapNativeClientLogic (no packages[0])', () => {
    assert.doesNotMatch(paywallJs, /packages\[0\]/);
    assert.doesNotMatch(paywallJs, /availablePackages\[0\]/);
    assert.match(paywallJs, /IAPManager\.purchasePackage\(selectedTier\)/);
    const managerSrc = fs.readFileSync(path.join(ROOT, 'public/js/iap-manager.js'), 'utf8');
    assert.match(managerSrc, /Logic\.pickPackageFromOffering/);
    assert.doesNotMatch(managerSrc, /packages\[0\]/);
  });

  test('E: configured trial_days alone uses ConditionalTrial, not KnownTrial', () => {
    const conditional = Logic.resolveTrialTermsKey(null, 14);
    assert.equal(conditional, 'ConditionalTrial');

    const known = Logic.resolveTrialTermsKey({ introPriceString: '0,00 kr' }, 14);
    assert.equal(known, 'KnownTrial');

    const noTrial = Logic.resolveTrialTermsKey(null, 0);
    assert.equal(noTrial, 'NoTrial');

    assert.match(paywallJs, /Logic\.resolveTrialTermsKey/);
    assert.doesNotMatch(paywallJs, /tierTermsKey/);
  });

  test('F: restore purchases uses IAPManager.restorePurchases', () => {
    assert.match(paywallJs, /async function restorePurchases/);
    assert.match(paywallJs, /IAPManager\.restorePurchases\(\)/);
    assert.match(paywallJs, /t\('paywall\.restoreNone'\)/);
    assert.match(paywallHtml, /id="paywallRestoreBtn"/);
  });

  test('G: gift-card control hidden in native mode', () => {
    assert.match(paywallJs, /hide\(document\.getElementById\('giftCardBtn'\)\)/);
    assert.match(paywallJs, /hide\(document\.getElementById\('giftRedeemPanel'\)\)/);
    assert.match(paywallJs, /function configureNativeMode/);
    assert.match(paywallHtml, /id="giftCardBtn"/);
  });

  test('H: terms and privacy links present with legal-routes resolver', () => {
    assert.match(paywallHtml, /data-legal-terms-link/);
    assert.match(paywallHtml, /data-legal-privacy-link/);
    assert.match(paywallHtml, /legal-routes\.js/);
    assert.match(paywallJs, /LegalRoutes\.fetchLegalRoutes/);
    assert.match(paywallHtml, /id="paywallAutoRenew"/);
  });

  test('I: purchase cannot double-submit', () => {
    assert.match(paywallJs, /let purchaseInProgress = false/);
    assert.match(paywallJs, /if \(purchaseInProgress \|\| !pricesReady\) return/);
    assert.match(paywallJs, /purchaseInProgress = true/);
    assert.match(paywallJs, /setPlanControlsDisabled\(true\)/);
    assert.match(paywallHtml, /id="paywallPurchaseBtn"[^>]*disabled/);
  });

  test('plan selection does not start purchase directly', () => {
    assert.match(paywallJs, /selectedTier = 'yearly'/);
    assert.match(paywallJs, /selectedTier = 'monthly'/);
    assert.match(paywallJs, /updatePlanSelection\(\)/);
    assert.doesNotMatch(paywallJs, /purchaseTier\(/);
    assert.match(paywallJs, /purchaseSelectedTier/);
    assert.match(paywallJs, /getElementById\('paywallPurchaseBtn'\)/);
  });

  test('loading state shown while prices fetch', () => {
    assert.match(paywallHtml, /id="paywallLoading"/);
    assert.match(paywallHtml, /paywall\.loadingPrices/);
    assert.match(paywallJs, /showLoadingPrices\(true\)/);
    assert.match(paywallJs, /setPurchaseCtaEnabled\(false\)/);
  });
});

describe('resolveTrialTermsKey', () => {
  test('intro price from store means known trial eligibility', () => {
    assert.equal(
      Logic.resolveTrialTermsKey({ introPriceString: 'Free' }, 14),
      'KnownTrial'
    );
  });

  test('trial_days config alone is conditional only', () => {
    assert.equal(Logic.resolveTrialTermsKey({ priceString: '59 kr' }, 14), 'ConditionalTrial');
  });

  test('no trial configured', () => {
    assert.equal(Logic.resolveTrialTermsKey({ priceString: '59 kr' }, null), 'NoTrial');
  });
});
