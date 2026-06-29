'use strict';

/**
 * Grant build-loop part on activity completion (idempotent per daily_log_item).
 */
async function tryGrantBuildPart(childId, dailyLogItemId, wasAlreadyCompleted) {
  if (wasAlreadyCompleted) return null;
  try {
    const buildDb = require('../../db/child-build-project');
    const gp = await buildDb.grantPart(childId, dailyLogItemId);
    if (!gp.granted) return null;
    return {
      part_number: gp.part_number,
      completed: gp.completed,
      project: {
        id: gp.project.id,
        name: gp.project.name,
        icon: gp.project.icon,
        parts_collected: gp.project.parts_collected,
        parts_required: gp.project.parts_required,
        progress_pct: gp.project.progress_pct,
        unlock_label: gp.project.unlock_label,
        catalog_slug: gp.project.catalog_slug,
        garage_unlocked: gp.project.garage_unlocked,
        status: gp.project.status,
      },
    };
  } catch (err) {
    console.error('[BUILD] grantPart:', err.message);
    return null;
  }
}

module.exports = { tryGrantBuildPart };
