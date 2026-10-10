'use strict';

const { sendApiError } = require('../lib/api-user-error');

/**
 * Public market registration gate status (pre-auth).
 */

const express = require('express');
const {
  isMarketOpenForRegistration,
  deriveMarketRegion,
  normalizeCountryCode,
  getMarketRegistrationStatus,
  readMarketGateFlag,
  GATE_KEYS,
} = require('../lib/market-region');
const { getMarketConfig } = require('../lib/market-config');
const { resolveLegalRoutes } = require('../lib/legal-routing');
const { REGISTRATION_COUNTRIES } = require('../../config/market-countries');
const { isEnglishAppGlobalEnabled } = require('../lib/english-app-global-flag');
const {
  isPublicBillingUsable,
  evaluatePublicSignupReadiness,
} = require('../lib/market-launch-invariants');
const {
  getPaymentStartAt,
  getPaymentStartAtForCountry,
} = require('../lib/payment-settings');
const { resolvePublicLaunchStates } = require('../lib/public-launch-state');
const {
  getIrelandFreeUntil,
  describeComplimentaryLaunchOffer,
  describeIrelandLaunchOffer,
} = require('../lib/ireland-launch-offer');
const { describePublicLaunchCohortOffer } = require('../../db/launch-cohort-offer');
const { loadLandingExperience } = require('../lib/landing-experience');

const router = express.Router();

// GET /api/market/registration-gates
router.get('/registration-gates', async (req, res) => {
  try {
    const codes = REGISTRATION_COUNTRIES.map((entry) => entry.code);
    const now = new Date();
    const [
      readinessEntries,
      publicBillingUsable,
      sePaymentStartAt,
      iePaymentStartAt,
      fiPaymentStartAt,
      englishAvailable,
      irelandFreeUntil,
      euBulkOpen,
    ] = await Promise.all([
      Promise.all(codes.map(async (code) => [code, await evaluatePublicSignupReadiness(code, { now })])),
      isPublicBillingUsable(),
      getPaymentStartAt(),
      getPaymentStartAtForCountry('IE'),
      getPaymentStartAtForCountry('FI'),
      isEnglishAppGlobalEnabled(),
      getIrelandFreeUntil(),
      readMarketGateFlag(GATE_KEYS.EU),
    ]);
    const signupAllowed = {};
    const openByCode = {};
    for (const [code, readiness] of readinessEntries) {
      signupAllowed[code] = readiness.allowed === true;
      openByCode[code] = readiness.marketOpen === true;
    }
    res.json({
      market_se_open: openByCode.SE === true,
      market_ie_open: openByCode.IE === true,
      market_ca_open: openByCode.CA === true,
      market_fi_open: openByCode.FI === true,
      market_no_open: openByCode.NO === true,
      market_dk_open: openByCode.DK === true,
      // The bulk flag's own value. It does not open Germany or any other country.
      market_eu_open: euBulkOpen === true,
      market_uk_open: openByCode.GB === true,
      market_us_open: openByCode.US === true,
      market_other_open: openByCode.ZZ === true,
      public_billing_usable: publicBillingUsable,
      english_available: englishAvailable,
      signup_allowed: signupAllowed,
      launch_state: resolvePublicLaunchStates({
        signupAllowedByCountry: signupAllowed,
        publicBillingUsable,
        countryCodes: codes,
      }),
      payment_start_at: {
        SE: sePaymentStartAt ? sePaymentStartAt.toISOString() : null,
        IE: iePaymentStartAt ? iePaymentStartAt.toISOString() : null,
        FI: fiPaymentStartAt ? fiPaymentStartAt.toISOString() : null,
      },
      launch_offer: {
        IE: describeIrelandLaunchOffer(irelandFreeUntil, now),
        CA: describeComplimentaryLaunchOffer('CA', irelandFreeUntil, now),
      },
    });
  } catch (err) {
    console.error('[MARKET] registration-gates error:', err);
    sendApiError(res, 500, 'MARKET_STATUS_FAILED');
  }
});

// GET /api/market/registration-status — structured market rows for admin-style UIs
router.get('/registration-status', async (req, res) => {
  try {
    const markets = await getMarketRegistrationStatus();
    res.json({ markets });
  } catch (err) {
    console.error('[MARKET] registration-status error:', err);
    sendApiError(res, 500, 'MARKET_STATUS_FAILED');
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
    sendApiError(res, 500, 'MARKET_COUNTRIES_FAILED');
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
    sendApiError(res, 500, 'MARKET_CONFIG_FAILED');
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
    sendApiError(res, 500, 'MARKET_LEGAL_FAILED');
  }
});

// GET /api/market/landing-experience?country_code=FI&locale=en-GB
// Country choice on the marketing page. Counts only while the launch offer is open.
router.get('/landing-experience', async (req, res) => {
  try {
    const countryCode = normalizeCountryCode(req.query.country_code);
    const locale = req.query.locale || req.query.preferred_locale || null;
    const body = await loadLandingExperience(countryCode, locale);
    res.set('Cache-Control', 'public, max-age=30');
    res.json(body);
  } catch (err) {
    if (err.status === 400) {
      return sendApiError(res, 400, err.apiCode || 'MARKET_COUNTRY_UNKNOWN');
    }
    console.error('[MARKET] landing-experience error:', err);
    sendApiError(res, 500, 'MARKET_STATUS_FAILED');
  }
});

// GET /api/market/launch-cohort-offer?country_code=DE&locale=de-DE
// Remaining places come only from the ledger, and only while a place can still be assigned.
router.get('/launch-cohort-offer', async (req, res) => {
  try {
    const countryCode = normalizeCountryCode(req.query.country_code);
    const locale = req.query.locale || req.query.preferred_locale || null;
    const offer = await describePublicLaunchCohortOffer(countryCode, locale);
    res.json(offer);
  } catch (err) {
    console.error('[MARKET] launch-cohort-offer error:', err);
    sendApiError(res, 500, 'MARKET_CONFIG_FAILED');
  }
});

module.exports = router;
