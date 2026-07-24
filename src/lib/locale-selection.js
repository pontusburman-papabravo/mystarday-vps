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
  remindLaterTimestamp,
  buildLocaleContextRow,
};
