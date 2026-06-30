'use strict';

/**
 * Evaluates unlock_signal strings from Experience Pack manifests.
 * No magic numbers — all thresholds live in pack config or signal names.
 */

function evaluateUnlockSignal(signal, context = {}) {
  if (!signal || typeof signal !== 'string') return false;

  const stats = context.stats || {};
  const unlockedNodes = new Set(context.unlockedNodeIds || []);

  if (signal === 'first_activity_complete') {
    return stats.child_completions === 1;
  }

  if (signal === 'first_reward_granted') {
    return Boolean(context.firstRewardGranted);
  }

  if (signal.startsWith('node_unlocked:')) {
    const nodeId = signal.slice('node_unlocked:'.length);
    return unlockedNodes.has(nodeId);
  }

  if (signal.startsWith('activity_count:')) {
    const min = parseInt(signal.slice('activity_count:'.length), 10);
    return !Number.isNaN(min) && stats.child_completions >= min;
  }

  if (signal.startsWith('milestone:')) {
    const milestone = signal.slice('milestone:'.length);
    return Boolean(context.milestones?.[milestone]);
  }

  return false;
}

function findUnlockableNodes(nodes, context) {
  const unlocked = new Set(context.unlockedNodeIds || []);
  const newlyUnlockable = [];

  for (const node of nodes) {
    if (unlocked.has(node.node_id)) continue;
    if (evaluateUnlockSignal(node.unlock_signal, context)) {
      newlyUnlockable.push(node);
    }
  }

  return newlyUnlockable;
}

module.exports = {
  evaluateUnlockSignal,
  findUnlockableNodes,
};
