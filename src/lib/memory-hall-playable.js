'use strict';

const { hasLivingWorldAccess, MEMORY_HALL_WORLD_SLUG } = require('./living-world-access');
const {
  resolvePackForChild,
  getWorldDef,
  buildExhibitViews,
} = require('./experience-pack');
const { buildSceneryFromPack } = require('./world-ambient');
const { resolveExhibitsForChild } = require('./memory-hall-exhibit-resolver');

const FEATURE_SLUG = 'memory_hall_playable';

/**
 * Minnesrummet (world 3) — warm pride room. BL-012 approved; dev-gated.
 */
async function isPlayableEnabled(familyId) {
  if (!familyId) return false;
  try {
    return await hasLivingWorldAccess(familyId, FEATURE_SLUG);
  } catch (err) {
    console.error('[memory-hall-playable] hasAccess error, defaulting disabled:', err.message);
    return false;
  }
}

async function buildSceneState(childId, familyId) {
  const pack = resolvePackForChild(childId);
  const worldDef = getWorldDef(pack, MEMORY_HALL_WORLD_SLUG);
  const packExhibits = buildExhibitViews(pack, MEMORY_HALL_WORLD_SLUG);
  const memories = await resolveExhibitsForChild(childId);
  const exhibits = packExhibits.length ? packExhibits : memories;

  return {
    enabled: true,
    scaffold: true,
    tone: 'pride',
    pack_id: pack.manifest.pack_id,
    world_slug: MEMORY_HALL_WORLD_SLUG,
    display_name: worldDef?.display_name_sv || 'Minnesrummet',
    first_enter_message: worldDef?.first_unlock_message || 'Här finns det du varit stolt över.',
    ambient_message: worldDef?.ambient_message_sv || 'Det känns varmt och tryggt här.',
    scenery: buildSceneryFromPack(worldDef),
    exhibits,
  };
}

module.exports = {
  FEATURE_SLUG,
  WORLD_SLUG: MEMORY_HALL_WORLD_SLUG,
  isPlayableEnabled,
  buildSceneState,
};
