'use strict';

/**
 * In-process cache for family override decisions (cleared on override writes).
 */

const TTL_MS = 30 * 1000;
const store = new Map();

function cacheKey(familyId, featureKey) {
  return `${familyId}:${featureKey}`;
}

function getCached(familyId, featureKey) {
  const entry = store.get(cacheKey(familyId, featureKey));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(cacheKey(familyId, featureKey));
    return null;
  }
  return entry.value;
}

function setCached(familyId, featureKey, value) {
  store.set(cacheKey(familyId, featureKey), {
    value,
    expiresAt: Date.now() + TTL_MS,
  });
}

function invalidateFamilyOverrideCache(familyId, featureKey) {
  if (familyId && featureKey) {
    store.delete(cacheKey(familyId, featureKey));
    return;
  }
  if (familyId) {
    for (const key of store.keys()) {
      if (key.startsWith(`${familyId}:`)) store.delete(key);
    }
    return;
  }
  store.clear();
}

module.exports = {
  getCached,
  setCached,
  invalidateFamilyOverrideCache,
};
