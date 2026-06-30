'use strict';

const { getWorldDef } = require('../experience-pack');
const eventBus = require('./event-bus');

function buildWorldFeedback(pack, unlockedNodes) {
  const feedback = [];

  for (const node of unlockedNodes) {
    const worldDef = getWorldDef(pack, node.world_slug);
    if (!worldDef) continue;

    const nodeFeedback = worldDef.unlock_feedback?.[node.node_id];
    feedback.push({
      world_slug: node.world_slug,
      world_name: worldDef.display_name_sv,
      node_id: node.node_id,
      child_message: nodeFeedback?.child_message || worldDef.first_unlock_message,
      visual_token: nodeFeedback?.visual_token || null,
      first_enter_message: worldDef.first_unlock_message,
    });
  }

  return feedback;
}

async function processWorld({ pack, newlyUnlocked }) {
  if (!newlyUnlocked?.length) return { feedback: [] };

  const feedback = buildWorldFeedback(pack, newlyUnlocked);

  for (const item of feedback) {
    await eventBus.emit(eventBus.EVENT_TYPES.PROGRESSION_NODE_UNLOCKED, {
      worldFeedback: item,
    });
  }

  return { feedback };
}

module.exports = {
  processWorld,
  buildWorldFeedback,
};
