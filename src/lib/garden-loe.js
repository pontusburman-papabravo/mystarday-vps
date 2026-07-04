'use strict';

/**
 * Garden Living Objects Engine — child-facing slot state + verb API.
 * Plant gate: at least one activity completed today (child timezone).
 * Connects Idag completion loop → Trädgården without platform_runtime flag.
 */

const db = require('./db');
const { resolvePackForChild } = require('./experience-pack');
const { loadLivingSlots, applyVerb } = require('./living-object-runtime');
const { WORLD_SLUG } = require('./garden-playable');
const { getLocalDateStr } = require('./daily-log-generator');

const PLANT_GATE_MESSAGE_SV = 'Klarmarkera något på Idag först!';
const PLANT_LOCKED_HINT_SV = 'Gör klart något på Idag — då kan du plantera här.';

const ALLOWED_VERBS = new Set(['plant', 'harvest']);

function q(client) {
  if (!client) return db;
  if (typeof client === 'function') return { query: client };
  return client;
}

async function getChildTimezone(childId, client) {
  const query = q(client);
  const result = await query.query('SELECT timezone FROM child WHERE id = $1', [childId]);
  return result.rows[0]?.timezone || 'Europe/Stockholm';
}

async function hasActivityCompletedToday(childId, client) {
  const query = q(client);
  const tz = await getChildTimezone(childId, query);
  const today = getLocalDateStr(new Date(), tz);
  const result = await query.query(
    `SELECT 1 FROM daily_log_item dli
     JOIN daily_log dl ON dl.id = dli.daily_log_id
     WHERE dl.child_id = $1 AND dl.date = $2 AND dli.completed = true
     LIMIT 1`,
    [childId, today]
  );
  return result.rows.length > 0;
}

function filterSlotsForPlantGate(slots, plantUnlocked) {
  return slots.map((slot) => {
    if (plantUnlocked || slot.state_key !== 'empty') {
      return { ...slot, plant_locked: false };
    }
    return {
      ...slot,
      plant_locked: true,
      available_verbs: (slot.available_verbs || []).filter((v) => v.verb !== 'plant'),
    };
  });
}

async function getSlots(childId, familyId, client) {
  const pack = resolvePackForChild(childId);
  const slots = await loadLivingSlots({ childId, worldSlug: WORLD_SLUG, pack }, client);
  const plantUnlocked = await hasActivityCompletedToday(childId, client);

  return {
    plant_unlocked: plantUnlocked,
    plant_locked_message_sv: plantUnlocked ? null : PLANT_LOCKED_HINT_SV,
    slots: filterSlotsForPlantGate(slots, plantUnlocked),
  };
}

async function performVerb({ childId, familyId, slotId, verb }, client) {
  if (!ALLOWED_VERBS.has(verb)) {
    return { ok: false, error: 'invalid_verb' };
  }

  if (verb === 'plant') {
    const plantUnlocked = await hasActivityCompletedToday(childId, client);
    if (!plantUnlocked) {
      return {
        ok: false,
        error: 'plant_locked',
        child_message_sv: PLANT_GATE_MESSAGE_SV,
      };
    }
  }

  const pack = resolvePackForChild(childId);
  return applyVerb({
    childId,
    familyId,
    worldSlug: WORLD_SLUG,
    slotId,
    verb,
    pack,
  }, client);
}

module.exports = {
  getSlots,
  performVerb,
  hasActivityCompletedToday,
  PLANT_GATE_MESSAGE_SV,
  PLANT_LOCKED_HINT_SV,
  ALLOWED_VERBS,
};
