'use strict';

/**
 * Per-family English rollout flags (features/family_features).
 * See migration 1810000000002_english_i18n_feature_flags.
 */

const { hasAccess } = require('../../db/features');

const ENGLISH_APP_SLUG = 'english_app';
const ENGLISH_CHILD_EXPERIENCE_SLUG = 'english_child_experience';

/**
 * Pre-auth flows (registration) may offer English without a family flag.
 * Existing families require english_app on family_features.
 * @param {string|null|undefined} familyId
 * @returns {Promise<boolean>}
 */
async function isEnglishAppEnabled(familyId) {
  if (!familyId) return true;
  return hasAccess(familyId, ENGLISH_APP_SLUG);
}

/**
 * child_en is gated separately until the English child UX is complete.
 * Requires BOTH english_app AND english_child_experience for the family.
 * @param {string|null|undefined} familyId
 * @returns {Promise<boolean>}
 */
async function isEnglishChildExperienceEnabled(familyId) {
  if (!familyId) return false;
  const [appOk, childOk] = await Promise.all([
    hasAccess(familyId, ENGLISH_APP_SLUG),
    hasAccess(familyId, ENGLISH_CHILD_EXPERIENCE_SLUG),
  ]);
  return appOk && childOk;
}

module.exports = {
  ENGLISH_APP_SLUG,
  ENGLISH_CHILD_EXPERIENCE_SLUG,
  isEnglishAppEnabled,
  isEnglishChildExperienceEnabled,
};
