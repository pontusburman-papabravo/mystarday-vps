'use strict';

const progressionDb = require('../../../db/child-progression-node');
const { findUnlockableNodes } = require('./unlock-signals');
const { getAllProgressionNodes } = require('../experience-pack');
const eventBus = require('./event-bus');

async function getUnlockedNodeIds(childId, client) {
  const rows = await progressionDb.listUnlockedNodes(childId, client);
  return rows.map((r) => r.node_id);
}

async function processProgression({ childId, familyId, pack, context }, client) {
  const nodes = getAllProgressionNodes(pack);
  const unlockedNodeIds = await getUnlockedNodeIds(childId, client);

  const evalContext = {
    ...context,
    unlockedNodeIds,
  };

  const unlockable = findUnlockableNodes(nodes, evalContext);
  const newlyUnlocked = [];
  let pending = unlockable;

  while (pending.length > 0) {
    for (const node of pending) {
      const inserted = await progressionDb.unlockNode({
        childId,
        familyId,
        worldSlug: node.world_slug,
        nodeId: node.node_id,
        nodeType: node.node_type,
        packConfigKey: node.pack_config_key,
        metadata: {
          name_sv: node.name_sv,
          emotional_beat: node.emotional_beat,
          pack_id: pack.manifest.pack_id,
        },
      }, client);

      if (inserted) {
        newlyUnlocked.push(node);
        unlockedNodeIds.push(node.node_id);
        await eventBus.emit(eventBus.EVENT_TYPES.PROGRESSION_NODE_UNLOCKED, {
          childId,
          familyId,
          node,
          pack,
        });
      }
    }

    pending = findUnlockableNodes(nodes, { ...evalContext, unlockedNodeIds });
  }

  return { newlyUnlocked, unlockedNodeIds };
}

module.exports = {
  processProgression,
  getUnlockedNodeIds,
};
