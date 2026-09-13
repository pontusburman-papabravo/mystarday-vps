'use strict';

const { HOST_2026_SURVEY_SLUG } = require('../../config/host-2026-survey');

/**
 * Public survey slugs that must work even when the global `enkater` feature is off.
 * Do not flip `enkater` live just to publish one campaign survey (that would also
 * unlock popups for other surveys if their popup flags are on).
 */
const PUBLIC_SURVEY_SLUG_ALLOWLIST = new Set([HOST_2026_SURVEY_SLUG]);

function isAllowlistedPublicSurveySlug(slug) {
  return typeof slug === 'string' && PUBLIC_SURVEY_SLUG_ALLOWLIST.has(slug);
}

async function isPublicSurveySlugAllowed(slug) {
  if (isAllowlistedPublicSurveySlug(slug)) return true;
  const { hasAccess } = require('../../db/features');
  return hasAccess(null, 'enkater');
}

module.exports = {
  HOST_2026_SURVEY_SLUG,
  PUBLIC_SURVEY_SLUG_ALLOWLIST,
  isAllowlistedPublicSurveySlug,
  isPublicSurveySlugAllowed,
};
