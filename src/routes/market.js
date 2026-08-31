'use strict';

/**
 * Public market registration gate status (pre-auth).
 */

const express = require('express');
const {
  isMarketOpenForRegistration,
  deriveMarketRegion,
  normalizeCountryCode,
  getMarketRegistrationStatus,
} = require('../lib/market-region');
const { getMarketConfig } = require('../lib/market-config');
const { resolveLegalRoutes } = require('../lib/legal-routing');
const { REGISTRATION_COUNTRIES } = require('../../config/market-countries');
const { isEnglishAppGlobalEnabled } = require('../lib/english-app-global-flag');
const {
  isPublicBillingUsable,
  evaluateSignupCompleteness,
} = require('../lib/market-launch-invariants');
const { getPaymentStartAt } = require('../lib/payment-settings');

const router = express.Router();

// GET /api/market/registration-gates
router.get('/registration-gates', async (req, res) => {
  try {
    const [
      se, ie, fi, no, dk, eu, uk, us, other,
      publicBillingUsable, paymentStartAt, englishAvailable,
    ] = await Promise.all([
      isMarketOpenForRegistration('SE'),
      isMarketOpenForRegistration('IE'),
      isMarketOpenForRegistration('FI'),
      isMarketOpenForRegistration('NO'),
      isMarketOpenForRegistration('DK'),
      isMarketOpenForRegistration('DE'),
      isMarketOpenForRegistration('GB'),
      isMarketOpenForRegistration('US'),
      isMarketOpenForRegistration('ZZ'),
      isPublicBillingUsable(),
      getPaymentStartAt(),
      isEnglishAppGlobalEnabled(),
    ]);
    const now = new Date();
    const signupAllowed = {};
    for (const [code, open] of [
      ['SE', se], ['IE', ie], ['FI', fi], ['NO', no], ['DK', dk],
      ['DE', eu], ['GB', uk], ['US', us], ['ZZ', other],
    ]) {
      signupAllowed[code] = evaluateSignupCompleteness({
        countryCode: code,
        marketOpen: open,
        publicBillingUsable,
        paymentStartAt,
        now,
      }).allowed;
    }
    res.json({
      market_se_open: se,
      market_ie_open: ie,
      market_fi_open: fi,
      market_no_open: no,
      market_dk_open: dk,
      market_eu_open: eu,
      market_uk_open: uk,
      market_us_open: us,
      market_other_open: other,
      public_billing_usable: publicBillingUsable,
      english_available: englishAvailable,
      signup_allowed: signupAllowed,
    });
  } catch (err) {
    console.error('[MARKET] registration-gates error:', err);
    res.status(500).json({ error: 'Kunde inte hämta marknadsstatus' });
  }
});

// GET /api/market/registration-status — structured market rows for admin-style UIs
router.get('/registration-status', async (req, res) => {
  try {
    const markets = await getMarketRegistrationStatus();
    res.json({ markets });
  } catch (err) {
    console.error('[MARKET] registration-status error:', err);
    res.status(500).json({ error: 'Kunde inte hämta marknadsstatus' });
  }
});

// GET /api/market/countries — registration country list with open flags
router.get('/countries', async (req, res) => {
  try {
    const countries = await Promise.all(
      REGISTRATION_COUNTRIES.map(async (entry) => ({
        code: entry.code,
        labels: entry.labels,
        group: entry.group || null,
        market_region: deriveMarketRegion(entry.code),
        open: await isMarketOpenForRegistration(entry.code),
      }))
    );
    res.json({ countries });
  } catch (err) {
    console.error('[MARKET] countries error:', err);
    res.status(500).json({ error: 'Kunde inte hämta länder' });
  }
});

// GET /api/market/config?country_code=IE&locale=en-GB
router.get('/config', (req, res) => {
  try {
    const countryCode = normalizeCountryCode(req.query.country_code) || 'SE';
    const locale = req.query.locale || req.query.preferred_locale || null;
    const marketRegion = deriveMarketRegion(countryCode);
    const config = getMarketConfig({ countryCode, marketRegion, locale });
    res.json(config);
  } catch (err) {
    console.error('[MARKET] config error:', err);
    res.status(500).json({ error: 'Kunde inte hämta marknadskonfiguration' });
  }
});

// GET /api/market/legal-routes?country_code=IE&locale=en-GB
router.get('/legal-routes', (req, res) => {
  try {
    const countryCode = normalizeCountryCode(req.query.country_code) || 'SE';
    const locale = req.query.locale || req.query.preferred_locale || null;
    const marketRegion = deriveMarketRegion(countryCode);
    const legal = resolveLegalRoutes({ countryCode, marketRegion, locale });
    res.json({
      country_code: countryCode,
      market_region: marketRegion,
      locale,
      ...legal,
    });
  } catch (err) {
    console.error('[MARKET] legal-routes error:', err);
    res.status(500).json({ error: 'Kunde inte hämta juridiska länkar' });
  }
});

module.exports = router;
