'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const limitedAccountHtml = fs.readFileSync(path.join(ROOT, 'public/limited-account.html'), 'utf8');
const paywallHtml = fs.readFileSync(path.join(ROOT, 'public/paywall.html'), 'utf8');
const paywallJs = fs.readFileSync(path.join(ROOT, 'public/js/paywall.js'), 'utf8');

describe('limited-account paywall isolation (P1 navigation loop)', () => {
  test('A: limited-account.html does NOT include paywall.js', () => {
    assert.doesNotMatch(limitedAccountHtml, /paywall\.js/i);
  });

  test('B: limited-account.html does NOT include iap-manager.js', () => {
    assert.doesNotMatch(limitedAccountHtml, /iap-manager\.js/i);
    assert.doesNotMatch(limitedAccountHtml, /iap-native-client-logic\.js/i);
  });

  test('C: /paywall still includes all required IAP scripts', () => {
    assert.match(paywallHtml, /iap-native-client-logic\.js/i);
    assert.match(paywallHtml, /iap-manager\.js/i);
    assert.match(paywallHtml, /paywall\.js/i);
    assert.match(paywallHtml, /legal-routes\.js/i);
    assert.match(paywallHtml, /i18n\.js/i);
  });

  test('D: paywall.js initializes only on /paywall route', () => {
    assert.match(paywallJs, /function isPaywallPage/);
    assert.match(paywallJs, /return path === '\/paywall'/);
    assert.match(paywallJs, /if \(!isPaywallPage\(\)\) return;/);
    assert.match(paywallJs, /addEventListener\('DOMContentLoaded', initPaywall\)/);
  });

  test('E: limited-account page has no paywall init or native purchase bootstrap', () => {
    assert.doesNotMatch(limitedAccountHtml, /initPaywall|IAPManager|loadNativePricing|RevenueCat/i);
    assert.doesNotMatch(limitedAccountHtml, /DOMContentLoaded.*paywall/i);
  });

  test('F: post-cutoff parent can remain stably on /limited-account', () => {
    assert.doesNotMatch(limitedAccountHtml, /\/dashboard/);
    assert.doesNotMatch(limitedAccountHtml, /DOMContentLoaded/);
    assert.doesNotMatch(limitedAccountHtml, /initPaywall/);
    assert.match(limitedAccountHtml, /Begränsat konto/);
    assert.match(limitedAccountHtml, /id="limitedLogoutBtn"/);
  });

  test('G: Aktivera Premium links exactly once to /paywall', () => {
    const matches = limitedAccountHtml.match(/href="\/paywall"/g) || [];
    assert.equal(matches.length, 1, 'expected exactly one /paywall link');
    assert.match(limitedAccountHtml, /Aktivera Premium/);
    assert.doesNotMatch(limitedAccountHtml, /onclick=.*paywall/i);
  });

  test('H: no /dashboard ↔ /limited-account ↔ /paywall redirect loop', () => {
    assert.doesNotMatch(limitedAccountHtml, /\/limited-account/);
    assert.doesNotMatch(limitedAccountHtml, /location\.(href|replace)\s*=\s*['"]\/dashboard/);
    assert.doesNotMatch(limitedAccountHtml, /location\.(href|replace)\s*=\s*['"]\/paywall/);

    const paywallToLimited = (paywallJs.match(/location\.href\s*=\s*'\/limited-account'/g) || []).length;
    assert.equal(paywallToLimited, 1, 'paywall close should be the only limited-account redirect');

    const paywallAutoDashboard = paywallJs.match(
      /if \(status\.premium && status\.premium\.active\)[\s\S]*?location\.href = '\/dashboard'/
    );
    assert.ok(paywallAutoDashboard, 'paywall should redirect to dashboard only when premium is active');

    assert.doesNotMatch(limitedAccountHtml, /setTimeout[\s\S]*\/paywall/);
    assert.doesNotMatch(limitedAccountHtml, /setTimeout[\s\S]*\/dashboard/);
  });
});
