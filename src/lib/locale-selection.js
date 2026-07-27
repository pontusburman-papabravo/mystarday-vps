'use strict';

/**
 * Locale selection metadata + English beta offer helpers.
 * Canonical locale remains family.preferred_locale (src/lib/locale.js).
 */

const { validateLocale, DEFAULT_LOCALE } = require('./locale');

const OFFER_STATES = Object.freeze({
  NOT_SHOWN: 'not_shown',
  REMIND_LATER: 'remind_later',
  ACCEPTED_ENGLISH: 'accepted_english_beta',
  DECLINED_ENGLISH: 'declined_english_beta',
  REGISTRATION_DECIDED: 'registration_decided',
});

const SELECTION_SOURCES = Object.freeze({
  REGISTRATION: 'registration',
  LOGIN: 'login',
  SETTINGS: 'settings',
  EXISTING_USER_OFFER: 'existing_user_offer',
  ADMIN: 'admin',
  LEGACY_DEFAULT: 'legacy_default',
});

/** Days before re-showing "remind me later" English beta offer. */
const REMIND_LATER_DAYS = 7;

const SESSION_ONLY_OFFER_KEY = 'sd_english_beta_offer_dismissed_session';

function isValidOfferState(state) {
  return Object.values(OFFER_STATES).includes(state);
}

function isValidSelectionSource(source) {
  return source == null || Object.values(SELECTION_SOURCES).includes(source);
}

/**
 * Whether an existing sv-SE family should see the one-time English beta offer.
 * @param {object} familyRow
 * @param {Date} [now]
 * @returns {boolean}
 */
function shouldShowEnglishBetaOffer(familyRow, now = new Date()) {
  if (!familyRow) return false;
  const locale = validateLocale(familyRow.preferred_locale);
  if (locale !== 'sv-SE') return false;

  const state = familyRow.english_beta_offer_state || OFFER_STATES.NOT_SHOWN;
  if (state === OFFER_STATES.REGISTRATION_DECIDED) return false;
  if (state === OFFER_STATES.ACCEPTED_ENGLISH) return false;
  if (state === OFFER_STATES.DECLINED_ENGLISH) return false;

  if (state === OFFER_STATES.REMIND_LATER) {
    const remindAt = familyRow.english_beta_offer_remind_at;
    if (!remindAt) return true;
    return new Date(remindAt) <= now;
  }

  if (state === OFFER_STATES.NOT_SHOWN) {
    const source = familyRow.locale_selection_source;
    return source === SELECTION_SOURCES.LEGACY_DEFAULT || source == null;
  }

  return false;
}

function remindLaterTimestamp(now = new Date()) {
  const d = new Date(now);
  d.setDate(d.getDate() + REMIND_LATER_DAYS);
  return d;
}

/**
 * Whether the one-time "existing activities stay in their original language"
 * notice is relevant. Pure DB signal — no free-text heuristics:
 * the family is on en-GB, previously used a Swedish locale (so its seeded/user
 * content was created under sv), and has not dismissed the notice.
 *
 * Switch signals (any of):
 * 1. previous_locale LIKE 'sv%' — written by every locale-switch path since
 *    the selection-metadata migration.
 * 2. previous_locale IS NULL AND english_beta_offer_state =
 *    'accepted_english_beta' — early beta families backfilled by migration
 *    1810000000005 before previous_locale was tracked.
 * 3. previous_locale IS NULL AND locale_selection_source is
 *    'legacy_default'/NULL — pre-i18n families whose locale was changed
 *    outside the tracked paths (registration with en-GB always writes
 *    source='registration', so this can only be a Swedish-seeded family).
 * @param {object} familyRow — needs preferred_locale, previous_locale,
 *   english_beta_offer_state, legacy_language_notice_dismissed_at
 * @returns {boolean}
 */
function shouldShowLegacyLanguageNotice(familyRow) {
  if (!familyRow) return false;
  if (validateLocale(familyRow.preferred_locale) !== 'en-GB') return false;
  if (familyRow.legacy_language_notice_dismissed_at) return false;
  const previous = String(familyRow.previous_locale || '');
  if (previous.toLowerCase().startsWith('sv')) return true;
  if (previous) return false;
  if (familyRow.english_beta_offer_state === OFFER_STATES.ACCEPTED_ENGLISH) return true;
  const source = familyRow.locale_selection_source;
  return source == null || source === SELECTION_SOURCES.LEGACY_DEFAULT;
}

function buildLocaleContextRow(row) {
  if (!row) return null;
  return {
    preferred_locale: validateLocale(row.preferred_locale),
    locale_selected_at: row.locale_selected_at || null,
    locale_selection_source: row.locale_selection_source || null,
    previous_locale: row.previous_locale || null,
    english_beta_offer_state: row.english_beta_offer_state || OFFER_STATES.NOT_SHOWN,
    english_beta_offer_remind_at: row.english_beta_offer_remind_at || null,
    show_english_beta_offer: shouldShowEnglishBetaOffer(row),
    english_is_beta: validateLocale(row.preferred_locale) === 'en-GB',
    show_legacy_language_notice: shouldShowLegacyLanguageNotice(row),
  };
}

module.exports = {
  OFFER_STATES,
  SELECTION_SOURCES,
  REMIND_LATER_DAYS,
  SESSION_ONLY_OFFER_KEY,
  DEFAULT_LOCALE,
  isValidOfferState,
  isValidSelectionSource,
  shouldShowEnglishBetaOffer,
  shouldShowLegacyLanguageNotice,
  remindLaterTimestamp,
  buildLocaleContextRow,
};
