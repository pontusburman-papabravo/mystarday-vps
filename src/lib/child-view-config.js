'use strict';

/**
 * Deep-merge child_view_config patches (memory_hall is nested).
 */
function mergeChildViewConfig(current, incoming) {
  const base = current && typeof current === 'object' ? current : {};
  const patch = incoming && typeof incoming === 'object' ? incoming : {};
  const merged = { ...base, ...patch };

  if (patch.memory_hall && typeof patch.memory_hall === 'object') {
    merged.memory_hall = {
      ...(base.memory_hall || {}),
      ...patch.memory_hall,
    };
  }

  return merged;
}

/**
 * Stamp opt-in metadata when parent enables warm_echo for the first time.
 */
function applyWarmEchoOptInMetadata(merged, previous, parentId) {
  if (!merged.memory_hall || merged.memory_hall.warm_echo_enabled !== true) {
    return merged;
  }
  const wasEnabled = previous.memory_hall && previous.memory_hall.warm_echo_enabled === true;
  if (wasEnabled) return merged;

  merged.memory_hall = {
    ...merged.memory_hall,
    warm_echo_opted_in_at: new Date().toISOString(),
    warm_echo_opted_in_by_parent_id: parentId || null,
  };
  return merged;
}

module.exports = {
  mergeChildViewConfig,
  applyWarmEchoOptInMetadata,
};
