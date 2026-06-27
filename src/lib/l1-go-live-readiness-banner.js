'use strict';

/**
 * Executive release-readiness state for go-live banner (read-only indicator).
 */
function computeGoLiveReadinessBanner(checklistItems, release = {}) {
  const items = checklistItems || [];
  const total = items.length;
  const completed = items.filter((i) => i.checked).length;
  const incompleteLabels = items.filter((i) => !i.checked).map((i) => i.label);

  let risk_level;
  if (completed === total && total > 0) {
    risk_level = 'LOW';
  } else if (completed >= 7) {
    risk_level = 'MEDIUM';
  } else {
    risk_level = 'HIGH';
  }

  return {
    total,
    completed,
    missing: incompleteLabels,
    risk_level,
    blockers: incompleteLabels,
    owner: release.l1_primary_owner || '',
    backup_owner: release.l1_backup_owner || '',
    review_dates: {
      day7: release.review_day_7_at || '',
      day14: release.review_day_14_at || '',
    },
  };
}

module.exports = { computeGoLiveReadinessBanner };
