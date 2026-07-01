'use strict';

/**
 * @param {Array<object>|Map<string, object>|Record<string, object>} homes
 * @returns {Record<string, object>}
 */
function homesById(homes) {
  if (homes instanceof Map) {
    return Object.fromEntries(homes.entries());
  }
  if (Array.isArray(homes)) {
    const map = {};
    for (const h of homes) map[h.id] = h;
    return map;
  }
  return homes || {};
}

/**
 * @param {string} homeId
 * @param {Record<string, object>} byId
 * @returns {{ id: string, label: string, color: string, icon: string|null }}
 */
function resolveHomeRecord(homeId, byId) {
  const home = byId[homeId];
  if (!home) {
    return {
      id: homeId,
      label: 'Hem',
      color: '#4F46E5',
      icon: null,
    };
  }
  return {
    id: home.id,
    label: home.label,
    color: home.color || '#4F46E5',
    icon: home.icon ?? null,
  };
}

module.exports = {
  homesById,
  resolveHomeRecord,
};
