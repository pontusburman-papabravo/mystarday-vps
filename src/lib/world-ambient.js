'use strict';

const { hasLivingWorldAccess } = require('./living-world-access');

/**
 * Shared ambient world helpers — pack-driven props, scenery, and feature gates.
 * Used by Morgonhuset (ambient_props) and Trädgården (ambient_scenery).
 */
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
      console.error('[world-ambient] gate error:', err.message);
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

function buildSceneryFromPack(worldDef) {
  return (worldDef?.ambient_scenery || []).map((entry) => ({
    scenery_id: entry.scenery_id,
    label_sv: entry.label_sv,
    emoji: entry.emoji || null,
    ambient_message: entry.ambient_message_sv || null,
    hotspot_class: entry.hotspot_class || null,
    living_slot_id: entry.living_slot_id || null,
  }));
}

function ambientPropToSceneProp(ambient, gate) {
  const leadsToWorld = gate.gated && ambient.gate_to_world
    ? ambient.gate_to_world
    : null;
  return {
    prop_id: ambient.prop_id,
    node_id: null,
    label_sv: ambient.label_sv,
    unlocked: true,
    visual_token: null,
    child_message: gate.message || ambient.ambient_message_sv || null,
    locked_hint: null,
    always_active: Boolean(ambient.always_active),
    leads_to_garden: leadsToWorld === 'garden',
    leads_to_world: leadsToWorld,
  };
}

module.exports = {
  resolveAmbientGate,
  buildSceneryFromPack,
  ambientPropToSceneProp,
};
