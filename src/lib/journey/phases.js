'use strict';

/**
 * Explicit phase transitions — Fas 1 only.
 * Writes journey_phase only via ingest pipeline.
 */

const TRANSITIONS = {
  SETTING_UP: ['FIRST_USE'],
  FIRST_USE: ['BUILDING_ROUTINE'],
  BUILDING_ROUTINE: ['ESTABLISHED_ROUTINE'],
};

const PHASE_ORDER = [
  'DISCOVERING',
  'SETTING_UP',
  'FIRST_USE',
  'BUILDING_ROUTINE',
  'ESTABLISHED_ROUTINE',
  'EXPANDING',
  'INDEPENDENCE',
];

/**
 * Deterministic phase from milestone map. Fail-safe → SETTING_UP on ambiguity.
 * @param {Record<string, string|boolean>} milestones
 * @returns {string}
 */
function derivePhase(milestones) {
  if (!milestones || typeof milestones !== 'object') return 'SETTING_UP';

  if (milestones.first_success) return 'BUILDING_ROUTINE';

  const hasRoutine = Boolean(milestones.routine_ready);
  const hasRewards = Boolean(milestones.rewards_ready);

  if (hasRoutine && hasRewards) return 'FIRST_USE';

  return 'SETTING_UP';
}

/**
 * Apply phase transition if allowed (monotonic forward only).
 * @param {string} currentPhase
 * @param {string} targetPhase
 * @returns {string}
 */
function resolvePhaseTransition(currentPhase, targetPhase) {
  const currentIdx = PHASE_ORDER.indexOf(currentPhase);
  const targetIdx = PHASE_ORDER.indexOf(targetPhase);
  if (currentIdx < 0 || targetIdx < 0) return 'SETTING_UP';
  if (targetIdx <= currentIdx) return currentPhase;
  const allowed = TRANSITIONS[currentPhase];
  if (!allowed || !allowed.includes(targetPhase)) {
    // Fail-safe: allow BUILDING_ROUTINE if first_success (may skip FIRST_USE in edge cases)
    if (targetPhase === 'BUILDING_ROUTINE' && currentPhase === 'FIRST_USE') {
      return 'BUILDING_ROUTINE';
    }
    return currentPhase;
  }
  return targetPhase;
}

function getPhaseDerivation(milestones) {
  if (milestones?.first_success) {
    return {
      rule: 'first_success → BUILDING_ROUTINE',
      milestones_considered: ['first_success'],
    };
  }
  if (milestones?.routine_ready && milestones?.rewards_ready) {
    return {
      rule: 'routine_ready && rewards_ready && !first_success → FIRST_USE',
      milestones_considered: ['routine_ready', 'rewards_ready', 'first_success'],
    };
  }
  return {
    rule: 'default → SETTING_UP',
    milestones_considered: ['routine_ready', 'rewards_ready', 'first_success'],
  };
}

module.exports = {
  TRANSITIONS,
  derivePhase,
  resolvePhaseTransition,
  getPhaseDerivation,
};
