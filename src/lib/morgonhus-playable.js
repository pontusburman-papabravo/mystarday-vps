'use strict';

const { hasAccess } = require('../../db/features');
const { hasLivingWorldAccess } = require('./living-world-access');
const {
  resolvePackForChild,
  getWorldDef,
  getAllProgressionNodes,
} = require('./experience-pack');
const progressionDb = require('../../db/child-progression-node');

const FEATURE_SLUG = 'morgonhus_playable';
const WORLD_SLUG = 'routine_home';

const AMBIENT_PROPS = [
  {
    prop_id: 'door',
    node_id: null,
    label_sv: 'Dörren',
    always_active: true,
    locked_hint: null,
    ambient_message: 'Dörren skakar lite — som om någon väntar därute.',
  },
];

/**
 * Playable Morgonhuset — per-family feature access (features/family_features).
 * Default denied when familyId missing, feature off, or not on dev allowlist.
 */
async function isPlayableEnabled(familyId) {
  if (!familyId) return false;
  try {
    return await hasAccess(familyId, FEATURE_SLUG);
  } catch (err) {
    console.error('[morgonhus-playable] hasAccess error, defaulting disabled:', err.message);
    return false;
  }
}

function propIdFromNode(nodeId) {
  if (!nodeId || !nodeId.startsWith('routine_home_')) return nodeId;
  return nodeId.slice('routine_home_'.length);
}

function buildPropsFromPack(pack, unlockedIds, gateToGarden = false) {
  const worldDef = getWorldDef(pack, WORLD_SLUG);
  const nodes = getAllProgressionNodes(pack).filter((n) => n.world_slug === WORLD_SLUG);

  const props = nodes.map((node) => {
    const feedback = worldDef?.unlock_feedback?.[node.node_id];
    const unlocked = unlockedIds.has(node.node_id);
    return {
      prop_id: propIdFromNode(node.node_id),
      node_id: node.node_id,
      label_sv: node.name_sv,
      unlocked,
      visual_token: unlocked ? (feedback?.visual_token || null) : null,
      child_message: unlocked ? (feedback?.child_message || null) : null,
      locked_hint: unlocked ? null : 'Inte redo än — fortsätt på Idag!',
      always_active: false,
    };
  });

  for (const ambient of AMBIENT_PROPS) {
    const isGardenDoor = ambient.prop_id === 'door' && gateToGarden;
    props.push({
      ...ambient,
      unlocked: true,
      visual_token: null,
      child_message: isGardenDoor ? 'Utanför väntar trädgården…' : ambient.ambient_message,
      leads_to_garden: isGardenDoor,
    });
  }

  return props;
}

async function buildSceneState(childId, familyIdOrClient) {
  let client;
  let familyId = null;
  if (familyIdOrClient && typeof familyIdOrClient.query === 'function') {
    client = familyIdOrClient;
  } else if (typeof familyIdOrClient === 'string') {
    familyId = familyIdOrClient;
  }

  const pack = resolvePackForChild(childId);
  const worldDef = getWorldDef(pack, WORLD_SLUG);
  const unlockedRows = await progressionDb.listUnlockedNodes(childId, client);
  const unlockedIds = new Set(unlockedRows.map((row) => row.node_id));

  let gateToGarden = false;
  if (familyId) {
    try {
      gateToGarden = await hasLivingWorldAccess(familyId, 'garden_playable');
    } catch (err) {
      console.error('[morgonhus-playable] garden gate error:', err.message);
    }
  }

  return {
    enabled: true,
    pack_id: pack.manifest.pack_id,
    world_slug: WORLD_SLUG,
    display_name: worldDef?.display_name_sv || 'Morgonhuset',
    first_enter_message: worldDef?.first_unlock_message || 'Morgonhuset väntar på dig',
    gate_to_garden: gateToGarden,
    props: buildPropsFromPack(pack, unlockedIds, gateToGarden),
    unlocked_node_ids: [...unlockedIds],
  };
}

module.exports = {
  FEATURE_SLUG,
  WORLD_SLUG,
  isPlayableEnabled,
  buildSceneState,
  buildPropsFromPack,
  propIdFromNode,
};
