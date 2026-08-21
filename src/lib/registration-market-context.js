'use strict';

/**
 * Shared country/locale/market resolution for new account creation (email + OAuth).
 */
const { resolvePreAuthLocale } = require('./locale');
const { t } = require('./i18n');
const { resolveAuthApiLocale, authApiMessage } = require('./auth-api-messages');
const { SELECTION_SOURCES, OFFER_STATES } = require('./locale-selection');
const {
  resolveRegistrationCountry,
  isMarketOpenForRegistration,
  isKnownRegistrationCountryCode,
  normalizeCountryCode,
  marketClosedCode,
} = require('./market-region');
const { getMarketConfig } = require('./market-config');

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

  const familyLocale = localeExplicitlyChosen
    ? resolvePreAuthLocale({
      explicit: preferredLocaleRaw,
      acceptLanguage: req.headers['accept-language'],
    })
    : resolvePreAuthLocale({ explicit: 'sv-SE' });

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

  const countryResolved = resolveRegistrationCountry({
    countryCodeRaw,
    localeExplicitlyChosen: localeExplicitlyChosen || Boolean(countryCodeRaw),
  });

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
    localeSelectionSource: localeExplicitlyChosen
      ? SELECTION_SOURCES.REGISTRATION
      : SELECTION_SOURCES.LEGACY_DEFAULT,
    englishBetaOfferState: localeExplicitlyChosen
      ? OFFER_STATES.REGISTRATION_DECIDED
      : OFFER_STATES.NOT_SHOWN,
  };
}

async function assertRegistrationMarketOpen(countryCode, familyLocale) {
  const marketOpen = await isMarketOpenForRegistration(countryCode);
  if (marketOpen) {
    return { ok: true };
  }
  const code = marketClosedCode(countryCode);
  return {
    ok: false,
    status: 403,
    body: {
      error: authApiMessage(familyLocale, `errors.marketClosed.${code}`),
      code,
      country_code: countryCode,
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
