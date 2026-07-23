'use strict';

/**
 * Locale-aware onboarding API messages.
 * Never use raw user input as locale key or file path.
 */

const db = require('./db');
const { resolveFamilyLocale } = require('./locale');
const { t } = require('./i18n');

const ERROR_KEYS = {
  AVATAR_UPLOAD_PATH: 'onboarding.errors.avatarUploadPath',
  CHILD_NAME_REQUIRED: 'onboarding.errors.childNameRequired',
  EMOJI_REQUIRED: 'onboarding.errors.emojiRequired',
  INVALID_BIRTHDAY: 'onboarding.errors.invalidBirthday',
  BIRTHDAY_FUTURE: 'onboarding.errors.birthdayFuture',
  INVALID_TEMPLATE: 'onboarding.errors.invalidTemplate',
  NO_ACTIVITIES: 'onboarding.errors.noActivities',
  CHILD_ID_REQUIRED: 'onboarding.errors.childIdRequired',
  NO_CHILD_ACCESS: 'onboarding.errors.noChildAccess',
  WEEKEND_NOT_FOUND: 'onboarding.errors.weekendNotFound',
  WEEKEND_EMPTY: 'onboarding.errors.weekendEmpty',
  REWARD_NAME_REQUIRED: 'onboarding.errors.rewardNameRequired',
  REWARD_COST_MIN: 'onboarding.errors.rewardCostMin',
  REWARDS_FETCH_FAILED: 'onboarding.errors.rewardsFetchFailed',
  CHILD_CREATE_FAILED: 'onboarding.errors.childCreateFailed',
  SCHEDULE_CREATE_FAILED: 'onboarding.errors.scheduleCreateFailed',
  WEEKEND_CREATE_FAILED: 'onboarding.errors.weekendCreateFailed',
  REWARD_CREATE_FAILED: 'onboarding.errors.rewardCreateFailed',
  GENERIC: 'onboarding.errors.generic',
  INVALID_VIEW_TYPE: 'onboarding.errors.invalidViewType',
  NOT_ALLOWED: 'onboarding.errors.notAllowed',
  INVALID_CHOICE: 'onboarding.errors.invalidChoice',
  ACTIVITY_GUIDE_SAVE_FAILED: 'onboarding.errors.activityGuideSaveFailed',
  PIN_MUST_BE_4: 'onboarding.errors.pinMustBe4',
  PIN_TOO_WEAK: 'onboarding.errors.pinTooWeak',
  PIN_TAKEN: 'onboarding.errors.pinTaken',
  PIN_UPDATE_FAILED: 'onboarding.errors.pinUpdateFailed',
  HANDOFF_CONTEXT_FAILED: 'onboarding.errors.handoffContextFailed',
  TEMPLATE_GROUPS_FAILED: 'onboarding.errors.templateGroupsFailed',
  SCHEDULE_PREVIEW_FAILED: 'onboarding.errors.schedulePreviewFailed',
  VIEW_SAVE_FAILED: 'onboarding.errors.viewSaveFailed',
  ACTIVATION_NOT_ENABLED: 'onboarding.errors.activationNotEnabled',
  STARTER_SUGGEST_FAILED: 'onboarding.errors.starterSuggestFailed',
  STARTER_PREVIEW_FAILED: 'onboarding.errors.starterPreviewFailed',
  STARTER_PERSONALIZE_FAILED: 'onboarding.errors.starterPersonalizeFailed',
  SCHEDULE_NAME_REQUIRED: 'onboarding.errors.scheduleNameRequired',
  TEMPLATE_NOT_FOUND: 'onboarding.errors.templateNotFound',
  ENROLL_CHOICE_UNAVAILABLE: 'onboarding.errors.enrollChoiceUnavailable',
};

/**
 * @param {string|null|undefined} familyId
 * @returns {Promise<string>}
 */
async function getFamilyLocale(familyId) {
  if (!familyId) return resolveFamilyLocale(null);
  const { rows } = await db.query(
    `SELECT COALESCE(preferred_locale, 'sv-SE') AS preferred_locale FROM family WHERE id = $1`,
    [familyId]
  );
  return resolveFamilyLocale(rows[0]?.preferred_locale);
}

/**
 * @param {string} lang
 * @param {keyof typeof ERROR_KEYS} code
 * @param {Record<string, string|number>} [params]
 * @returns {string}
 */
function onboardingMessage(lang, code, params) {
  const key = ERROR_KEYS[code] || ERROR_KEYS.GENERIC;
  return t(lang, key, params);
}

/**
 * @param {import('express').Response} res
 * @param {number} status
 * @param {string} lang
 * @param {keyof typeof ERROR_KEYS} code
 * @param {Record<string, string|number>} [params]
 */
function sendOnboardingError(res, status, lang, code, params) {
  return res.status(status).json({ error: onboardingMessage(lang, code, params) });
}

module.exports = {
  ERROR_KEYS,
  getFamilyLocale,
  onboardingMessage,
  sendOnboardingError,
};
