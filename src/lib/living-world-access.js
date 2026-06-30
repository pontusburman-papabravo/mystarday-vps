'use strict';

const { hasAccess } = require('../../db/features');

const GARDEN_PLAYABLE_SLUG = 'garden_playable';
const GARDEN_WORLD_SLUG = 'garden';

const FEATURE_BY_WORLD = {
  [GARDEN_WORLD_SLUG]: GARDEN_PLAYABLE_SLUG,
};

/**
 * Per-family Living World access — wraps features/family_features hasAccess.
 * Fail-closed when familyId missing or DB error.
 */
async function hasLivingWorldAccess(familyId, slugOrWorld) {
  if (!familyId) return false;
  const featureSlug = FEATURE_BY_WORLD[slugOrWorld] || slugOrWorld;
  try {
    return await hasAccess(familyId, featureSlug);
  } catch (err) {
    console.error('[living-world-access] hasAccess error, defaulting disabled:', err.message);
    return false;
  }
}

module.exports = {
  GARDEN_PLAYABLE_SLUG,
  GARDEN_WORLD_SLUG,
  hasLivingWorldAccess,
};
