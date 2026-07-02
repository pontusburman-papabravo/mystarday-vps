'use strict';

const { hasLivingWorldAccess, GARDEN_WORLD_SLUG } = require('./living-world-access');
const {
  resolvePackForChild,
  getWorldDef,
} = require('./experience-pack');

const FEATURE_SLUG = 'garden_playable';

function buildSceneryFromPack(worldDef) {
  return (worldDef?.ambient_scenery || []).map((entry) => ({
    scenery_id: entry.scenery_id,
    label_sv: entry.label_sv,
    emoji: entry.emoji || null,
    ambient_message: entry.ambient_message_sv || null,
    hotspot_class: entry.hotspot_class || null,
  }));
}

/**
 * Playable Trädgården — ambient scene only (no LOE verbs/timers).
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

async function buildSceneState(childId) {
  const pack = resolvePackForChild(childId);
  const worldDef = getWorldDef(pack, GARDEN_WORLD_SLUG);

  return {
    enabled: true,
    pack_id: pack.manifest.pack_id,
    world_slug: GARDEN_WORLD_SLUG,
    display_name: worldDef?.display_name_sv || 'Trädgården',
    first_enter_message: worldDef?.first_unlock_message || 'Trädgården väntar på dig',
    ambient_message: worldDef?.ambient_message_sv || 'Gräset rör sig långsamt i brisen.',
    scenery: buildSceneryFromPack(worldDef),
  };
}

module.exports = {
  FEATURE_SLUG,
  WORLD_SLUG: GARDEN_WORLD_SLUG,
  isPlayableEnabled,
  buildSceneState,
  buildSceneryFromPack,
};
