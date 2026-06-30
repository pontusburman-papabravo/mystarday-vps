'use strict';

/**
 * Platform event bus — age-agnostic events emitted by Core Engine hooks.
 * Experience Pack runtimes subscribe; no pack-specific logic here.
 */

const EVENT_TYPES = {
  ACTIVITY_COMPLETE: 'onActivityComplete',
  MILESTONE: 'onMilestone',
  PROGRESSION_NODE_UNLOCKED: 'onProgressionNodeUnlocked',
  REWARD_GRANTED: 'onRewardGranted',
};

const listeners = new Map();

function on(eventType, handler) {
  if (!listeners.has(eventType)) listeners.set(eventType, []);
  listeners.get(eventType).push(handler);
}

function off(eventType, handler) {
  const list = listeners.get(eventType);
  if (!list) return;
  const idx = list.indexOf(handler);
  if (idx >= 0) list.splice(idx, 1);
}

async function emit(eventType, payload) {
  const list = listeners.get(eventType) || [];
  const results = [];
  for (const handler of list) {
    results.push(await handler(payload));
  }
  return results;
}

function resetListeners() {
  listeners.clear();
}

module.exports = {
  EVENT_TYPES,
  on,
  off,
  emit,
  resetListeners,
};
