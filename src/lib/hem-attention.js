'use strict';

/** Locked Hem attention order (B2). */
const HEM_ATTENTION_ORDER = ['safety', 'status', 'coach', 'handoff', 'week'];

/**
 * @param {boolean|null} resOk null = loading, true = success, false = failed
 * @param {boolean} hasItems
 * @returns {'loading'|'error'|'ok_items'|'ok_empty'}
 */
function hemLoadOutcome(resOk, hasItems) {
  if (resOk === null) return 'loading';
  if (resOk === false) return 'error';
  return hasItems ? 'ok_items' : 'ok_empty';
}

/** Coach may render only when safety is known-empty — never on error/loading/items. */
function hemCoachAllowed(safetyOutcome) {
  return safetyOutcome === 'ok_empty';
}

function hemNothingRequiresAttention(safetyOutcome, hasCoach) {
  return safetyOutcome === 'ok_empty' && !hasCoach;
}

function hemTreatAsEmpty(outcome) {
  return outcome === 'ok_empty';
}

module.exports = {
  HEM_ATTENTION_ORDER,
  hemLoadOutcome,
  hemCoachAllowed,
  hemNothingRequiresAttention,
  hemTreatAsEmpty,
};
