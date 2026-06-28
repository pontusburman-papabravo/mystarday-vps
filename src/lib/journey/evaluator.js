'use strict';

const { ReasonCode } = require('./reason-codes');
const { derivePhase, getPhaseDerivation } = require('./phases');

const REGISTRY_VERSION = '2026-06-28-v1';

/**
 * Pure evaluator — no DB access.
 * Fail-safe: always returns valid context; blocking_experience null on inconsistency.
 * @param {{ phase?: string, milestones?: Record<string, unknown> }} input
 */
function deriveContext(input = {}) {
  const milestones = input.milestones && typeof input.milestones === 'object'
    ? { ...input.milestones }
    : {};

  const celebrationShown = Boolean(milestones._celebration_shown);
  delete milestones._celebration_shown;

  let phase = input.phase || derivePhase(milestones);

  // Fail-safe: inconsistent combos → SETTING_UP, no blocking
  const inconsistent = isInconsistent(milestones);
  if (inconsistent) {
    phase = 'SETTING_UP';
    return {
      phase,
      milestones,
      recommended_experiences: [],
      blocking_experience: null,
      celebration: null,
      priority: 'none',
      reason: [ReasonCode.INCONSISTENT_STATE],
      registry_version: REGISTRY_VERSION,
    };
  }

  const reason = deriveReasonCodes(phase, milestones);

  if (phase === 'FIRST_USE' && !milestones.child_logged_in) {
    return {
      phase,
      milestones,
      recommended_experiences: ['handoff_to_child'],
      blocking_experience: 'handoff_to_child',
      celebration: null,
      priority: 'handoff',
      reason,
      registry_version: REGISTRY_VERSION,
    };
  }

  if (milestones.first_success && !celebrationShown) {
    return {
      phase: 'BUILDING_ROUTINE',
      milestones,
      recommended_experiences: ['celebrate_first_success'],
      blocking_experience: null,
      celebration: 'celebrate_first_success',
      priority: 'celebration',
      reason: [ReasonCode.FIRST_SUCCESS_COMPLETED],
      registry_version: REGISTRY_VERSION,
    };
  }

  if (phase === 'BUILDING_ROUTINE' || milestones.first_success) {
    return {
      phase: 'BUILDING_ROUTINE',
      milestones,
      recommended_experiences: [],
      blocking_experience: null,
      celebration: null,
      priority: 'none',
      reason: milestones.first_success
        ? [ReasonCode.FIRST_SUCCESS_COMPLETED]
        : reason,
      registry_version: REGISTRY_VERSION,
    };
  }

  if (phase === 'FIRST_USE') {
    return {
      phase,
      milestones,
      recommended_experiences: ['handoff_to_child'],
      blocking_experience: null,
      celebration: null,
      priority: 'coach',
      reason,
      registry_version: REGISTRY_VERSION,
    };
  }

  return {
    phase: 'SETTING_UP',
    milestones,
    recommended_experiences: [],
    blocking_experience: null,
    celebration: null,
    priority: 'none',
    reason: [ReasonCode.PHASE_SETTING_UP],
    registry_version: REGISTRY_VERSION,
  };
}

function isInconsistent(milestones) {
  // child_logged_in without setup milestones
  if (milestones.child_logged_in && (!milestones.routine_ready || !milestones.rewards_ready)) {
    return true;
  }
  // first_success without both prerequisites
  if (milestones.first_success) {
    if (!milestones.child_first_completion || !milestones.parent_saw_completion) {
      return true;
    }
  }
  return false;
}

/**
 * @param {string} phase
 * @param {Record<string, unknown>} milestones
 * @returns {string[]}
 */
function deriveReasonCodes(phase, milestones) {
  const codes = [];
  if (phase === 'FIRST_USE' && !milestones.child_logged_in) {
    codes.push(ReasonCode.NO_CHILD_LOGIN);
    codes.push(ReasonCode.READY_FOR_HANDOFF);
  }
  if (milestones.child_first_completion && !milestones.parent_saw_completion) {
    codes.push(ReasonCode.WAITING_FOR_PARENT_ACK);
  }
  if (phase === 'FIRST_USE' && milestones.child_logged_in && !milestones.child_first_completion) {
    codes.push(ReasonCode.AWAITING_FIRST_COMPLETION);
  }
  if (milestones.first_success) {
    codes.push(ReasonCode.FIRST_SUCCESS_COMPLETED);
  }
  if (codes.length === 0 && phase === 'SETTING_UP') {
    codes.push(ReasonCode.PHASE_SETTING_UP);
  }
  return codes;
}

function getContextDerivation(context) {
  if (context.reason?.includes(ReasonCode.INCONSISTENT_STATE)) {
    return {
      rule: 'inconsistent milestones → SETTING_UP, blocking_experience null',
      reason: context.reason,
    };
  }
  if (context.blocking_experience === 'handoff_to_child') {
    return {
      rule: 'FIRST_USE && !child_logged_in → handoff_to_child',
      reason: context.reason,
    };
  }
  if (context.celebration === 'celebrate_first_success') {
    return {
      rule: 'first_success && !celebration_shown → celebrate_first_success',
      reason: context.reason,
    };
  }
  return {
    rule: 'no blocking or celebration',
    reason: context.reason,
  };
}

module.exports = {
  REGISTRY_VERSION,
  deriveContext,
  deriveReasonCodes,
  getContextDerivation,
  derivePhase,
  getPhaseDerivation,
};
