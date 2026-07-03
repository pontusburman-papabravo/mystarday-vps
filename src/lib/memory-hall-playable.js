'use strict';

const { hasLivingWorldAccess, MEMORY_HALL_WORLD_SLUG } = require('./living-world-access');
const {
  resolvePackForChild,
  getWorldDef,
  buildExhibitViews,
} = require('./experience-pack');
const { buildSceneryFromPack } = require('./world-ambient');

const FEATURE_SLUG = 'memory_hall_playable';

/**
 * Memory Hall (world 3) — scaffold only. Feature off by default (dev, no allowlist).
 * Creative content blocked BL-012; exhibits[] reserved for future slots.
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

async function buildSceneState(childId) {
  const pack = resolvePackForChild(childId);
  const worldDef = getWorldDef(pack, MEMORY_HALL_WORLD_SLUG);

  return {
    enabled: true,
    scaffold: true,
    pack_id: pack.manifest.pack_id,
    world_slug: MEMORY_HALL_WORLD_SLUG,
    display_name: worldDef?.display_name_sv || 'Minneshallen',
    first_enter_message: worldDef?.first_unlock_message || 'Här samlas minnena.',
    ambient_message: worldDef?.ambient_message_sv || 'Det är tyst och lugnt.',
    scenery: buildSceneryFromPack(worldDef),
    exhibits: buildExhibitViews(pack, MEMORY_HALL_WORLD_SLUG),
    exhibit_slot_types: Object.keys(pack.exhibits?.slot_types || {}),
  };
}

module.exports = {
  FEATURE_SLUG,
  WORLD_SLUG: MEMORY_HALL_WORLD_SLUG,
  isPlayableEnabled,
  buildSceneState,
};
