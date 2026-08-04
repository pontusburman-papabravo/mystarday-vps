'use strict';

/**
 * Deterministic locale resolution for auth transactional emails.
 *
 * Verification: family.preferred_locale set at registration (same transaction).
 * Password reset:
 *   1. validated preferred_locale from forgot-password body (page language)
 *   2. parent.family_id → family.preferred_locale
 *   3. Accept-Language / sv-SE
 *
 * Locale is allowlisted via validateLocale — never used as a file path.
 */

const {
  DEFAULT_LOCALE,
  normalizeLocale,
  resolveFamilyLocale,
  resolvePreAuthLocale,
  validateLocale,
} = require('./locale');

/**
 * Locale for verification email at registration.
 * @param {string} familyLocale canonical locale stored on family row
 * @returns {string}
 */
function resolveVerificationEmailLocale(familyLocale) {
  return resolveFamilyLocale(familyLocale);
}

/**
 * Locale for password reset email.
 * @param {object} input
 * @param {string|null|undefined} input.familyPreferredLocale from DB
 * @param {string|null|undefined} input.requestLocale from client body (optional)
 * @param {string|null|undefined} input.acceptLanguage Accept-Language header
 * @returns {string}
 */
function resolvePasswordResetEmailLocale({
  familyPreferredLocale,
  requestLocale,
  acceptLanguage,
} = {}) {
  const fromForm = normalizeLocale(requestLocale);
  if (fromForm) {
    return fromForm;
  }
  if (familyPreferredLocale) {
    return resolveFamilyLocale(familyPreferredLocale);
  }
  return resolvePreAuthLocale({
    explicit: requestLocale,
    acceptLanguage,
  });
}

module.exports = {
  DEFAULT_LOCALE,
  resolveVerificationEmailLocale,
  resolvePasswordResetEmailLocale,
  validateLocale,
};
