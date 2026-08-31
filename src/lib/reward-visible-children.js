'use strict';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Normalize visible_to_children for reward create/update.
 * null = all children, [] = none, [uuid...] = only listed children (family-scoped).
 * Foreign or invalid UUIDs are filtered out (not expanded to "all").
 */
async function normalizeVisibleToChildren(db, familyId, input) {
  if (input === undefined) {
    return { value: undefined };
  }
  if (input === null) {
    return { value: null };
  }
  if (!Array.isArray(input)) {
    return { error: 'visible_to_children måste vara null eller en array' };
  }
  const rawIds = [...new Set(
    input.filter((id) => typeof id === 'string' && id.length > 0)
  )];
  if (rawIds.length === 0) {
    return { value: [] };
  }
  const uuids = rawIds.filter((id) => UUID_RE.test(id));
  if (uuids.length === 0) {
    return { value: [] };
  }
  const validChildren = await db.query(
    `SELECT id FROM child WHERE id = ANY($1::uuid[]) AND family_id = $2`,
    [uuids, familyId]
  );
  const validSet = new Set(validChildren.rows.map((r) => r.id));
  const filtered = uuids.filter((id) => validSet.has(id));
  return { value: filtered };
}

/** Active rewards are assignment/hub-eligible. Inactive (soft-deleted) are editor-only. */
function isRewardActive(reward) {
  return !!(reward && reward.is_active !== false);
}

/**
 * null/undefined = every child; [] = nobody; [ids] = listed children only.
 */
function isRewardVisibleToChild(reward, childId) {
  if (!reward) return false;
  const vtc = reward.visible_to_children;
  if (vtc == null) return true;
  if (!Array.isArray(vtc)) return true;
  if (!childId) return false;
  return vtc.some((id) => String(id) === String(childId));
}

function rewardBelongsToFamily(reward, familyId) {
  if (!reward || familyId == null || reward.family_id == null) return true;
  return String(reward.family_id) === String(familyId);
}

/**
 * Lowest-cost visible+active reward the child has not reached, else cheapest eligible.
 * @returns {object|null}
 */
function selectNearestReward(rewards, opts) {
  const childId = opts && opts.childId;
  const familyId = opts && opts.familyId;
  const balance = Number(opts && opts.balance) || 0;
  const eligible = (rewards || [])
    .filter((r) => isRewardActive(r) && rewardBelongsToFamily(r, familyId) && isRewardVisibleToChild(r, childId))
    .slice()
    .sort((a, b) => (Number(a.star_cost) || 0) - (Number(b.star_cost) || 0));
  return eligible.find((r) => Number(r.star_cost) > balance) || eligible[0] || null;
}

function activeRewardsForAssignment(rewards) {
  return (rewards || []).filter(isRewardActive);
}

/** List-label kind for the library editor. */
function visibilityLabelKind(vtc) {
  if (vtc == null) return 'all';
  if (Array.isArray(vtc) && vtc.length === 0) return 'none';
  if (Array.isArray(vtc)) return 'some';
  return 'all';
}

/**
 * Editor checkboxes: null (all) → every child checked; [] → none; [ids] → those.
 */
function editorCheckboxIdsForReward(vtc, allChildIds) {
  const ids = Array.isArray(allChildIds) ? allChildIds.map(String) : [];
  if (vtc == null) return ids.slice();
  if (!Array.isArray(vtc)) return ids.slice();
  const allow = new Set(vtc.map(String));
  return ids.filter((id) => allow.has(id));
}

/**
 * Persist visibility from editor checkboxes.
 * New reward with no children checked stays family-wide (null).
 * Edit with none checked is explicitly hidden ([]).
 * All children checked collapses to null.
 */
function visibleToChildrenFromEditorChecks(checkedIds, childCount, isNew) {
  const checked = Array.isArray(checkedIds) ? checkedIds : [];
  const n = Number(childCount) || 0;
  if (n === 0) return null;
  if (checked.length === 0) return isNew ? null : [];
  if (checked.length >= n) return null;
  return checked;
}

module.exports = {
  normalizeVisibleToChildren,
  UUID_RE,
  isRewardActive,
  isRewardVisibleToChild,
  rewardBelongsToFamily,
  selectNearestReward,
  activeRewardsForAssignment,
  visibilityLabelKind,
  editorCheckboxIdsForReward,
  visibleToChildrenFromEditorChecks,
};
