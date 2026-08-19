'use strict';

/**
 * English rollout flags — central gate for parent/auth en-GB (ADR-017, ADR-021).
 * Features seeded in 1810000000002; promoted live in 1810310000000_english_app_live.
 */

const { hasAccess } = require('../../db/features');
const { getFamilyPreferredLocale, isEnglishFamilyLocale } = require('./family-locale');
const { isEnglishAppGlobalEnabled } = require('./english-app-global-flag');

const ENGLISH_APP_SLUG = 'english_app';
const ENGLISH_CHILD_EXPERIENCE_SLUG = 'english_child_experience';

/**
 * Pre-auth flows always expose both locales in UI (registration language choice).
 * @param {string|null|undefined} familyId
 * @returns {Promise<boolean>}
 */
async function isEnglishAppEnabled(familyId) {
  if (!familyId) return true;

  if (await isEnglishAppGlobalEnabled()) return true;

  if (await hasAccess(familyId, ENGLISH_APP_SLUG)) return true;

  const familyLocale = await getFamilyPreferredLocale(familyId);
  return isEnglishFamilyLocale(familyLocale);
}

/**
 * Whether the family may newly select en-GB (settings, login explicit choice).
 * Does not grandfather — use isEnglishAppEnabled for active UI when already on en-GB.
 * @param {string|null|undefined} familyId
 * @returns {Promise<boolean>}
 */
async function canSelectEnglishLocale(familyId) {
  if (!familyId) return true;
  if (await isEnglishAppGlobalEnabled()) return true;
  return hasAccess(familyId, ENGLISH_APP_SLUG);
}

/**
 * Whether the family may use the English child pack (child_en).
 * Feature is live for all families; child UI still requires en-GB family locale
 * (see resolveChildUiLocale / experiencePackIdForLocale).
 * @param {string|null|undefined} familyId
 * @returns {Promise<boolean>}
 */
async function isEnglishChildExperienceEnabled(familyId) {
  if (!familyId) return false;
  const appOk = await isEnglishAppEnabled(familyId);
  if (!appOk) return false;
  return hasAccess(familyId, ENGLISH_CHILD_EXPERIENCE_SLUG);
}

module.exports = {
  ENGLISH_APP_SLUG,
  ENGLISH_CHILD_EXPERIENCE_SLUG,
  isEnglishAppEnabled,
  canSelectEnglishLocale,
  isEnglishChildExperienceEnabled,
};
