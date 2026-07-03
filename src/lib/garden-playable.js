'use strict';

const { hasLivingWorldAccess, GARDEN_WORLD_SLUG } = require('./living-world-access');
const {
  resolvePackForChild,
  getWorldDef,
} = require('./experience-pack');
const { loadLivingSlots, applyVerb } = require('./living-object-runtime');
const { buildSceneryFromPack } = require('./world-ambient');

const FEATURE_SLUG = 'garden_playable';

/**
 * Playable Trädgården — ambient scene + pack-driven living objects (LOE).
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

async function buildSceneState(childId, familyIdOrClient) {
  const pack = resolvePackForChild(childId);
  const worldDef = getWorldDef(pack, GARDEN_WORLD_SLUG);
  const livingSlots = await loadLivingSlots({
    childId,
    worldSlug: GARDEN_WORLD_SLUG,
    pack,
  });

  return {
    enabled: true,
    pack_id: pack.manifest.pack_id,
    world_slug: GARDEN_WORLD_SLUG,
    display_name: worldDef?.display_name_sv || 'Trädgården',
    first_enter_message: worldDef?.first_unlock_message || 'Trädgården väntar på dig',
    ambient_message: worldDef?.ambient_message_sv || 'Gräset rör sig långsamt i brisen.',
    scenery: buildSceneryFromPack(worldDef),
    living_slots: livingSlots,
  };
}

async function applyLivingVerb(childId, familyId, slotId, verb) {
  const pack = resolvePackForChild(childId);
  return applyVerb({
    childId,
    familyId,
    worldSlug: GARDEN_WORLD_SLUG,
    slotId,
    verb,
    pack,
  });
}

module.exports = {
  FEATURE_SLUG,
  WORLD_SLUG: GARDEN_WORLD_SLUG,
  isPlayableEnabled,
  buildSceneState,
  buildSceneryFromPack,
  applyLivingVerb,
};
