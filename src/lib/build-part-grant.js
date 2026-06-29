'use strict';

/**
 * Grant build-loop part on activity completion (idempotent per daily_log_item).
 */
async function tryGrantBuildPart(childId, dailyLogItemId, wasAlreadyCompleted) {
  if (wasAlreadyCompleted) return null;
  try {
    const buildDb = require('../../db/child-build-project');
    const {
      guideMessage,
      milestoneReward,
    } = require('./build-progress');
    const gp = await buildDb.grantPart(childId, dailyLogItemId);
    if (!gp.granted) return null;
    const guide = guideMessage(gp.project.catalog_slug, {
      partsCollected: gp.project.parts_collected,
      partsRequired: gp.project.parts_required,
      unlockLabel: gp.project.unlock_label,
      milestoneHit: gp.milestone_hit,
      completed: gp.completed,
      justEarned: true,
    });
    const milestoneRewardInfo = gp.milestone_hit
      ? milestoneReward(gp.project.catalog_slug, gp.milestone_hit)
      : null;
    return {
      part_number: gp.part_number,
      completed: gp.completed,
      milestone_hit: gp.milestone_hit,
      milestone_reward: milestoneRewardInfo,
      guide_message: guide,
      project: gp.project,
    };
  } catch (err) {
    console.error('[BUILD] grantPart:', err.message);
    return null;
  }
}

module.exports = { tryGrantBuildPart };
