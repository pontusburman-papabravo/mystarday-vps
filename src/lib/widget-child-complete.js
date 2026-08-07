'use strict';

const { completeDailyLogItemCore } = require('./daily-log-complete-core');

/**
 * Widget completion — delegates to shared core with actor attribution.
 * trusted_device / child_session: completed_by child (shared tablet, no named adult).
 * parent binding: completed_by parent + widget_* source.
 */
async function completeChildDailyLogItem({
  childId,
  familyId,
  dailyLogItemId,
  completionSource,
  bindingMode,
  parentId,
}) {
  const completedBy = bindingMode === 'parent' ? 'parent' : 'child';
  return completeDailyLogItemCore({
    dailyLogItemId,
    childId,
    familyId,
    completedBy,
    completedByParentId: bindingMode === 'parent' ? parentId : null,
    completionSource,
  });
}

module.exports = { completeChildDailyLogItem };
