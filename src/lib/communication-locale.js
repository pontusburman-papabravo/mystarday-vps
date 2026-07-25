'use strict';

/**
 * Canonical locale for server-generated family communications.
 *
 * Rule: family.preferred_locale is authoritative for family-scoped messages.
 * Pre-family / security-only messages use auth-email-locale helpers.
 */

const { resolveFamilyLocale, DEFAULT_LOCALE } = require('./locale');

/**
 * @param {string|null|undefined} familyPreferredLocale
 * @returns {'sv-SE'|'en-GB'}
 */
function resolveCommunicationLocale(familyPreferredLocale) {
  return resolveFamilyLocale(familyPreferredLocale);
}

module.exports = {
  DEFAULT_LOCALE,
  resolveCommunicationLocale,
};
