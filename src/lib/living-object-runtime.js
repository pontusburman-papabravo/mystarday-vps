'use strict';

const livingObjectDb = require('../../db/living-object');
const {
  resolvePackForChild,
  getLivingWorldDef,
  getLivingArchetype,
} = require('./experience-pack');

/** Legacy rows: planted + timer_started_at before water verb shipped */
const LEGACY_PLANTED_TIMER_MS = 30000;

function findStateDef(archetype, stateKey) {
  return (archetype.states || []).find((s) => s.state_key === stateKey) || null;
}

function resolveTimerMs(archetype, stateKey, stateData) {
  const stateDef = findStateDef(archetype, stateKey);
  if (stateDef?.timer_ms) return stateDef.timer_ms;
  if (stateKey === 'planted' && stateData?.timer_started_at) {
    return LEGACY_PLANTED_TIMER_MS;
  }
  return null;
}

function getVerbsForState(archetype, stateKey) {
  return (archetype.verbs || []).filter((v) => v.from_state === stateKey);
}

function resolveTimerNextState(archetype, stateKey, stateData) {
  const stateDef = findStateDef(archetype, stateKey);
  const timerMs = resolveTimerMs(archetype, stateKey, stateData);
  if (!timerMs) return null;
  const nextState = stateDef?.timer_next_state
    || (stateKey === 'planted' ? 'blooming' : null);
  if (!nextState) return null;
  const startedAt = stateData?.timer_started_at;
  if (!startedAt) return null;
  const elapsed = Date.now() - new Date(startedAt).getTime();
  if (elapsed >= timerMs) {
    return nextState;
  }
  return null;
}

function timerRemainingMs(archetype, stateKey, stateData) {
  const timerMs = resolveTimerMs(archetype, stateKey, stateData);
  if (!timerMs) return null;
  const startedAt = stateData?.timer_started_at;
  if (!startedAt) return timerMs;
  const remaining = timerMs - (Date.now() - new Date(startedAt).getTime());
  return remaining > 0 ? remaining : 0;
}

function formatSlotView(slotDef, archetype, instance) {
  const stateKey = instance ? instance.state_key : archetype.initial_state;
  const stateDef = findStateDef(archetype, stateKey);
  const verbs = getVerbsForState(archetype, stateKey);

  const view = {
    slot_id: slotDef.slot_id,
    label_sv: slotDef.label_sv,
    archetype_id: archetype.archetype_id,
    display_name_sv: archetype.display_name_sv,
    state_key: stateKey,
    label_state_sv: stateDef?.label_sv || stateKey,
    visual_token: stateDef?.visual_token || null,
    available_verbs: verbs.map((v) => ({
      verb: v.verb,
      child_message_sv: v.child_message_sv || null,
    })),
    instance_id: instance?.id || null,
    version: instance?.version || 0,
  };

  const remaining = timerRemainingMs(archetype, stateKey, instance?.state_data || {});
  if (remaining != null) {
    view.timer_remaining_ms = remaining;
  }

  return view;
}

async function ensureTimerResolved(instance, archetype, client) {
  const nextState = resolveTimerNextState(
    archetype,
    instance.state_key,
    instance.state_data || {}
  );
  if (!nextState) return instance;

  const result = await livingObjectDb.updateState({
    instanceId: instance.id,
    expectedVersion: instance.version,
    stateKey: nextState,
    stateData: {},
  }, client);

  return result.updated ? result.row : instance;
}

async function loadLivingSlots({ childId, worldSlug, pack }, client) {
  const worldDef = getLivingWorldDef(pack, worldSlug);
  if (!worldDef) return [];

  const instances = await livingObjectDb.listByChild(childId, worldSlug, client);
  const bySlot = new Map(instances.map((row) => [row.slot_id, row]));
  const slots = [];

  for (const slotDef of worldDef.slots || []) {
    const archetype = getLivingArchetype(pack, worldSlug, slotDef.default_archetype_id);
    if (!archetype) continue;

    let instance = bySlot.get(slotDef.slot_id) || null;
    if (instance) {
      instance = await ensureTimerResolved(instance, archetype, client);
    }
    slots.push(formatSlotView(slotDef, archetype, instance));
  }

  return slots;
}

function buildStateDataForTransition(archetype, toState) {
  const stateDef = findStateDef(archetype, toState);
  if (stateDef?.timer_ms) {
    return { timer_started_at: new Date().toISOString() };
  }
  return {};
}

async function applyVerb({
  childId,
  familyId,
  worldSlug,
  slotId,
  verb,
  pack,
}, client) {
  const worldDef = getLivingWorldDef(pack, worldSlug);
  if (!worldDef) {
    return { ok: false, error: 'world_not_found' };
  }

  const slotDef = (worldDef.slots || []).find((s) => s.slot_id === slotId);
  if (!slotDef) {
    return { ok: false, error: 'slot_not_found' };
  }

  const archetype = getLivingArchetype(pack, worldSlug, slotDef.default_archetype_id);
  if (!archetype) {
    return { ok: false, error: 'archetype_not_found' };
  }

  let instance = await livingObjectDb.getBySlot(childId, worldSlug, slotId, client);
  if (instance) {
    instance = await ensureTimerResolved(instance, archetype, client);
  }

  const currentState = instance ? instance.state_key : archetype.initial_state;
  const verbDef = (archetype.verbs || []).find(
    (v) => v.verb === verb && v.from_state === currentState
  );
  if (!verbDef) {
    return { ok: false, error: 'verb_not_allowed', state_key: currentState };
  }

  const nextState = verbDef.to_state;
  const stateData = buildStateDataForTransition(archetype, nextState);

  if (!instance) {
    const created = await livingObjectDb.createInstance({
      childId,
      familyId,
      worldSlug,
      archetypeId: archetype.archetype_id,
      slotId,
      stateKey: nextState,
      stateData,
    }, client);
    return {
      ok: true,
      slot: formatSlotView(slotDef, archetype, created),
      child_message_sv: verbDef.child_message_sv || null,
    };
  }

  const result = await livingObjectDb.updateState({
    instanceId: instance.id,
    expectedVersion: instance.version,
    stateKey: nextState,
    stateData,
  }, client);

  if (result.conflict) {
    return { ok: false, error: 'version_conflict' };
  }

  return {
    ok: true,
    slot: formatSlotView(slotDef, archetype, result.row),
    child_message_sv: verbDef.child_message_sv || null,
  };
}

module.exports = {
  loadLivingSlots,
  applyVerb,
  formatSlotView,
  resolveTimerNextState,
  getVerbsForState,
};
