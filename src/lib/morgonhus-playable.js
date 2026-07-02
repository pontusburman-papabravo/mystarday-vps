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

async function resolveAmbientGate(familyId, ambient, accessCache) {
  if (!ambient.gate_to_world || !familyId) {
    return { gated: false, message: ambient.ambient_message_sv || null };
  }

  const featureSlug = ambient.gate_feature_slug || `${ambient.gate_to_world}_playable`;
  let allowed = accessCache.get(featureSlug);
  if (allowed === undefined) {
    try {
      allowed = await hasLivingWorldAccess(familyId, featureSlug);
    } catch (err) {
      console.error('[morgonhus-playable] ambient gate error:', err.message);
      allowed = false;
    }
    accessCache.set(featureSlug, allowed);
  }

  if (!allowed) {
    return { gated: false, message: ambient.ambient_message_sv || null };
  }

  return {
    gated: true,
    message: ambient.gate_message_sv || ambient.ambient_message_sv || null,
    leads_to_world: ambient.gate_to_world,
  };
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
    const leadsToGarden = gate.gated && ambient.gate_to_world === 'garden';
    props.push({
      prop_id: ambient.prop_id,
      node_id: null,
      label_sv: ambient.label_sv,
      unlocked: true,
      visual_token: null,
      child_message: gate.message || ambient.ambient_message_sv || null,
      locked_hint: null,
      always_active: Boolean(ambient.always_active),
      leads_to_garden: leadsToGarden,
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
