'use strict';

/**
 * Localized JSON messages for auth API routes (login, register, email flows).
 * Uses auth.api.* keys with fallback to existing auth.errors.* / auth.* page keys.
 */

const { t } = require('./i18n');
const { resolvePreAuthLocale, resolveFamilyLocale } = require('./locale');

const API_PREFIX = 'auth.api.';

/**
 * Resolve locale for auth API responses.
 * Family locale wins when provided (e.g. from DB); otherwise pre-auth resolution.
 * @param {import('express').Request} req
 * @param {{ familyPreferredLocale?: string|null }} [opts]
 * @returns {string}
 */
function resolveAuthApiLocale(req, opts = {}) {
  if (opts.familyPreferredLocale) {
    return resolveFamilyLocale(opts.familyPreferredLocale);
  }

  const body = req.body || {};
  const query = req.query || {};
  return resolvePreAuthLocale({
    explicit: body.preferred_locale || body.language || query.preferred_locale || query.language,
    acceptLanguage: req.headers?.['accept-language'],
  });
}

/**
 * @param {string} lang
 * @param {string} fullKey
 * @param {Record<string, string|number>} params
 * @returns {string|null}
 */
function lookupMessage(lang, fullKey, params) {
  const text = t(lang, fullKey, params);
  return text !== fullKey ? text : null;
}

/**
 * Localized auth API string.
 * @param {string} lang canonical locale
 * @param {string} key dot path under auth.api (e.g. errors.invalidCredentials)
 * @param {Record<string, string|number>} [params]
 * @returns {string}
 */
function authApiMessage(lang, key, params = {}) {
  const fromApi = lookupMessage(lang, `${API_PREFIX}${key}`, params);
  if (fromApi) return fromApi;

  const fromAuth = lookupMessage(lang, `auth.${key}`, params);
  if (fromAuth) return fromAuth;

  return t(lang, `${API_PREFIX}${key}`, params);
}

module.exports = {
  resolveAuthApiLocale,
  authApiMessage,
};
