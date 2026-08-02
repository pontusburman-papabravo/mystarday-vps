'use strict';

/**
 * Sort key for child-facing daily log items.
 * child_sort_order is only set when the child drag-reorders (allow_child_reorder).
 * NULL means "follow parent's sort_order".
 */
function effectiveChildItemSortOrder(item) {
  if (item == null) return 0;
  if (item.child_sort_order != null) return item.child_sort_order;
  return item.sort_order != null ? item.sort_order : 0;
}

function compareChildDailyLogItems(a, b) {
  if (a.section !== b.section) return 0;
  return effectiveChildItemSortOrder(a) - effectiveChildItemSortOrder(b);
}

module.exports = {
  effectiveChildItemSortOrder,
  compareChildDailyLogItems,
};
