'use strict';

const { hasLivingWorldAccess, GARDEN_WORLD_SLUG } = require('./living-world-access');
const {
  resolvePackForChild,
  getWorldDef,
} = require('./experience-pack');

const FEATURE_SLUG = 'garden_playable';

const AMBIENT_SCENERY = [
  {
    scenery_id: 'garden_path',
    label_sv: 'Stigen',
    emoji: '🌿',
    ambient_message: 'Stigen leder längre in i trädgården.',
  },
  {
    scenery_id: 'garden_bed',
    label_sv: 'Blomsterbädden',
    emoji: '🪴',
    ambient_message: 'Jorden känns mjuk och varm under fingrarna.',
  },
  {
    scenery_id: 'garden_sky',
    label_sv: 'Himlen',
    emoji: '☁️',
    ambient_message: 'Molnen rör sig långsamt.',
  },
];

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
    ambient_message: 'Gräset rör sig långsamt i brisen.',
    scenery: AMBIENT_SCENERY,
  };
}

module.exports = {
  FEATURE_SLUG,
  WORLD_SLUG: GARDEN_WORLD_SLUG,
  isPlayableEnabled,
  buildSceneState,
};
