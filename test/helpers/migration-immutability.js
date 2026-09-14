'use strict';

/**
 * Classify a migrations/ path from a git diff against origin/main.
 *
 * Two-dot `git diff origin/main -- migrations/` lists files that exist on
 * origin/main but not on HEAD as if they were modified. That is a false FAIL
 * when another PR lands a new migration while this branch's CI is running
 * (PR #1189 vs #1187: 181049).
 *
 * Deleting or editing a file that existed at the merge-base is a real
 * in-place change of an applied migration.
 */
function isSilentAppliedMigrationEdit({ onMain, onHead, existedAtMergeBase }) {
  if (!onMain) return false;
  if (onHead) return true;
  return Boolean(existedAtMergeBase);
}

module.exports = { isSilentAppliedMigrationEdit };
