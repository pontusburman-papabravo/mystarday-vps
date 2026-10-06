'use strict';

/**
 * Shared country/locale/market resolution for new account creation (email + OAuth).
 */
const { resolveAccountLocale } = require('./locale');
const { t } = require('./i18n');
const { resolveAuthApiLocale, authApiMessage } = require('./auth-api-messages');
const { SELECTION_SOURCES, OFFER_STATES } = require('./locale-selection');
const {
  resolveRegistrationCountry,
  isKnownRegistrationCountryCode,
  normalizeCountryCode,
} = require('./market-region');
const { getMarketConfig, resolveMarketDefaults } = require('./market-config');
const { evaluatePublicSignupReadiness } = require('./market-launch-invariants');

/**
 * @param {import('express').Request} req
 * @param {Record<string, unknown>} [body]
 * @param {{ requireExplicitCountry?: boolean }} [opts]
 */
function resolveNewAccountRegistrationContext(req, body = {}, opts = {}) {
  const { requireExplicitCountry = false } = opts;
  const preAuthLang = resolveAuthApiLocale(req);
  const countryCodeRaw = body.country_code;
  const preferredLocaleRaw = body.preferred_locale || body.landing_locale || body.language;
  const localeExplicitlyChosen = Boolean(preferredLocaleRaw);

  const countryResolved = resolveRegistrationCountry({
    countryCodeRaw,
    localeExplicitlyChosen: localeExplicitlyChosen || Boolean(countryCodeRaw),
  });
  const marketDefaults = resolveMarketDefaults(
    countryResolved.country_code,
    countryResolved.market_region
  );
  const accountLocale = resolveAccountLocale({
    explicit: preferredLocaleRaw,
    acceptLanguage: req.headers['accept-language'],
    marketDefaultLocale: marketDefaults.defaultLocale,
  });
  const familyLocale = accountLocale.locale;

  if (requireExplicitCountry && (!countryCodeRaw || !String(countryCodeRaw).trim())) {
    return {
      ok: false,
      status: 400,
      body: {
        error: authApiMessage(familyLocale, 'errors.countryRequired'),
        code: 'COUNTRY_REQUIRED',
      },
    };
  }

  if (countryCodeRaw && !isKnownRegistrationCountryCode(normalizeCountryCode(countryCodeRaw))) {
    return {
      ok: false,
      status: 400,
      body: { error: authApiMessage(familyLocale, 'errors.invalidCountry') },
    };
  }

  const marketConfig = getMarketConfig({
    countryCode: countryResolved.country_code,
    marketRegion: countryResolved.market_region,
    locale: familyLocale,
  });

  return {
    ok: true,
    preAuthLang,
    familyLocale,
    countryResolved,
    marketConfig,
    localeResolutionSource: accountLocale.source,
    localeSelectionSource: accountLocale.source === 'fallback'
      ? SELECTION_SOURCES.LEGACY_DEFAULT
      : SELECTION_SOURCES.REGISTRATION,
    englishBetaOfferState: accountLocale.source === 'fallback'
      ? OFFER_STATES.NOT_SHOWN
      : OFFER_STATES.REGISTRATION_DECIDED,
  };
}

async function assertRegistrationMarketOpen(countryCode, familyLocale) {
  const readiness = await evaluatePublicSignupReadiness(countryCode);
  if (readiness.allowed) {
    return { ok: true, readiness };
  }
  return {
    ok: false,
    status: 403,
    body: {
      error: authApiMessage(familyLocale, `errors.marketClosed.${readiness.code}`),
      code: readiness.code,
      country_code: countryCode,
      reason: readiness.reason,
    },
  };
}

function buildAutoFamilyName(displayName, familyLocale) {
  const trimmed = String(displayName || '').trim() || 'Parent';
  return t(familyLocale, 'auth.register.familyNameSuffix', { name: trimmed });
}

module.exports = {
  resolveNewAccountRegistrationContext,
  assertRegistrationMarketOpen,
  buildAutoFamilyName,
};
