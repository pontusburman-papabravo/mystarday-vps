'use strict';

const { hasAccess } = require('../../db/features');
const {
  resolvePackForChild,
  getWorldDef,
  getAllProgressionNodes,
} = require('./experience-pack');
const { resolveAmbientGate, ambientPropToSceneProp } = require('./world-ambient');
const progressionDb = require('../../db/child-progression-node');

const FEATURE_SLUG = 'morgonhus_playable';
const WORLD_SLUG = 'routine_home';

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

function buildPropsFromPack(pack, unlockedIds, ambientGates = new Map()) {
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

  for (const ambient of worldDef?.ambient_props || []) {
    const gate = ambientGates.get(ambient.prop_id) || { gated: false, message: ambient.ambient_message_sv };
    props.push(ambientPropToSceneProp(ambient, gate));
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

  const accessCache = new Map();
  const ambientGates = new Map();
  for (const ambient of worldDef?.ambient_props || []) {
    const gate = await resolveAmbientGate(familyId, ambient, accessCache);
    ambientGates.set(ambient.prop_id, gate);
  }

  const gateToGarden = [...ambientGates.values()].some(
    (g) => g.gated && g.leads_to_world === 'garden'
  );

  return {
    enabled: true,
    pack_id: pack.manifest.pack_id,
    world_slug: WORLD_SLUG,
    display_name: worldDef?.display_name_sv || 'Morgonhuset',
    first_enter_message: worldDef?.first_unlock_message || 'Morgonhuset väntar på dig',
    gate_to_garden: gateToGarden,
    props: buildPropsFromPack(pack, unlockedIds, ambientGates),
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
  resolveAmbientGate,
};
