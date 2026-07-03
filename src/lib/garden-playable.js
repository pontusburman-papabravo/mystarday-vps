'use strict';

const { hasLivingWorldAccess, GARDEN_WORLD_SLUG } = require('./living-world-access');
const {
  resolvePackForChild,
  getWorldDef,
} = require('./experience-pack');
const { buildSceneryFromPack, buildSceneryWithGates } = require('./world-ambient');

const FEATURE_SLUG = 'garden_playable';

/**
 * Playable Trädgården — ambient scene with pack-driven scenery gates.
 */
async function isPlayableEnabled(familyId) {
  if (!familyId) return false;
  try {
    return await hasLivingWorldAccess(familyId, FEATURE_SLUG);
  } catch (err) {
    console.error('[garden-playable] hasAccess error, defaulting disabled:', err.message);
    return false;
  }
}

async function buildSceneState(childId, familyId) {
  const pack = resolvePackForChild(childId);
  const worldDef = getWorldDef(pack, GARDEN_WORLD_SLUG);

  const scenery = familyId
    ? await buildSceneryWithGates(familyId, worldDef)
    : buildSceneryFromPack(worldDef);

  return {
    enabled: true,
    pack_id: pack.manifest.pack_id,
    world_slug: GARDEN_WORLD_SLUG,
    display_name: worldDef?.display_name_sv || 'Trädgården',
    first_enter_message: worldDef?.first_unlock_message || 'Trädgården väntar på dig',
    ambient_message: worldDef?.ambient_message_sv || 'Gräset rör sig långsamt i brisen.',
    scenery,
  };
}

module.exports = {
  FEATURE_SLUG,
  WORLD_SLUG: GARDEN_WORLD_SLUG,
  isPlayableEnabled,
  buildSceneState,
};
