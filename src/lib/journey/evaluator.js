'use strict';

const { ReasonCode } = require('./reason-codes');
const { derivePhase, getPhaseDerivation, needsHandoff } = require('./phases');
const { pickFirstWeekExperience } = require('./first-week');

const DEFAULT_REGISTRY_VERSION = '2026-06-28-v1';

/**
 * @param {{ phase?: string, milestones?: Record<string, unknown>, opts?: object, registryVersion?: string }} input
 */
function deriveContext(input = {}) {
  const milestones = input.milestones && typeof input.milestones === 'object'
    ? { ...input.milestones }
    : {};
  const opts = input.opts || {};
  const registryVersion = input.registryVersion || DEFAULT_REGISTRY_VERSION;

  if (opts.pedagogSkip) {
    return emptyContext('SETTING_UP', milestones, registryVersion, [ReasonCode.PEDAGOG_SKIP]);
  }

  const celebrationShown = Boolean(milestones._celebration_shown || opts.celebrationShown);
  delete milestones._celebration_shown;

  let phase = input.phase || derivePhase(milestones, opts);

  if (isInconsistent(milestones)) {
    return emptyContext('SETTING_UP', milestones, registryVersion, [ReasonCode.INCONSISTENT_STATE]);
  }

  // Parent ack blocking (Fas 2+)
  if (milestones.child_first_completion && !milestones.parent_saw_completion && !milestones.first_success) {
    return {
      phase,
      milestones,
      recommended_experiences: ['parent_ack_completion'],
      blocking_experience: 'parent_ack_completion',
      celebration: null,
      priority: 'coach',
      reason: [ReasonCode.WAITING_FOR_PARENT_ACK],
      registry_version: registryVersion,
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
      registry_version: registryVersion,
    };
  }

  if (needsHandoff(milestones, phase)) {
    const reason = phase === 'EXPANDING'
      ? [ReasonCode.EXPANDING_HANDOFF, ReasonCode.NO_CHILD_LOGIN]
      : [ReasonCode.NO_CHILD_LOGIN, ReasonCode.READY_FOR_HANDOFF];
    return {
      phase,
      milestones,
      recommended_experiences: ['handoff_to_child'],
      blocking_experience: 'handoff_to_child',
      celebration: null,
      priority: 'handoff',
      reason,
      registry_version: registryVersion,
      handoff_child_id: milestones._pending_handoff_child_id || null,
    };
  }

  if (phase === 'INDEPENDENCE') {
    return {
      phase,
      milestones,
      recommended_experiences: [],
      blocking_experience: null,
      celebration: null,
      priority: 'none',
      reason: [ReasonCode.INDEPENDENCE_ACHIEVED],
      registry_version: registryVersion,
    };
  }

  if (phase === 'ESTABLISHED_ROUTINE') {
    return {
      phase,
      milestones,
      recommended_experiences: opts.coachEnabled ? ['coach_expand'] : [],
      blocking_experience: null,
      celebration: null,
      priority: opts.coachEnabled ? 'coach' : 'none',
      reason: [ReasonCode.ESTABLISHED_ROUTINE],
      registry_version: registryVersion,
    };
  }

  if (phase === 'BUILDING_ROUTINE' && opts.coachEnabled && !milestones.established_routine) {
    const fw = tryFirstWeekExperience(phase, milestones, {
      ...opts,
      celebrationShown,
      registryVersion,
    });
    if (fw) return fw;

    const experiences = ['coach_consistency'];
    if (!milestones.evening_routine_added) experiences.push('coach_evening');
    return {
      phase,
      milestones,
      recommended_experiences: experiences,
      blocking_experience: null,
      celebration: null,
      priority: 'coach',
      reason: [ReasonCode.COACH_CONSISTENCY],
      registry_version: registryVersion,
    };
  }

  if (phase === 'FIRST_USE' && milestones.child_logged_in) {
    return {
      phase,
      milestones,
      recommended_experiences: [],
      blocking_experience: null,
      celebration: null,
      priority: 'coach',
      reason: deriveReasonCodes(phase, milestones),
      registry_version: registryVersion,
    };
  }

  if (phase === 'FIRST_USE') {
    return {
      phase,
      milestones,
      recommended_experiences: ['handoff_to_child'],
      blocking_experience: null,
      celebration: null,
      priority: 'handoff',
      reason: deriveReasonCodes(phase, milestones),
      registry_version: registryVersion,
    };
  }

  return emptyContext(phase, milestones, registryVersion, deriveReasonCodes(phase, milestones));
}

function tryFirstWeekExperience(phase, milestones, opts) {
  if (!opts.firstWeekEnabled || !opts.celebrationShown) return null;
  const fwDay = opts.firstWeekDay;
  if (!fwDay || fwDay < 1 || fwDay > 7) return null;

  const pick = pickFirstWeekExperience({
    day: fwDay,
    signals: opts.firstWeekSignals || {},
    milestones,
    now: opts.now || new Date(),
    timezone: opts.timezone || 'Europe/Stockholm',
  });

  if (pick.fallthrough) return null;

  if (pick.silent || (!pick.experience && pick.priority === 'none')) {
    return {
      phase,
      milestones,
      recommended_experiences: [],
      blocking_experience: null,
      celebration: null,
      priority: 'none',
      reason: [ReasonCode.FIRST_WEEK_SILENT, pick.reason],
      registry_version: opts.registryVersion || DEFAULT_REGISTRY_VERSION,
      first_week: { day: fwDay, silent: true, reason: pick.reason },
    };
  }

  if (!pick.experience) return null;

  const reasonMap = {
    fw_day3_new_day: ReasonCode.FIRST_WEEK_SETBACK,
    fw_day4_discovery: ReasonCode.FIRST_WEEK_DISCOVERY,
    fw_week_reflection: ReasonCode.FIRST_WEEK_REFLECTION,
  };
  const reasons = [ReasonCode.FIRST_WEEK_DAY, reasonMap[pick.experience] || pick.reason].filter(Boolean);

  return {
    phase,
    milestones,
    recommended_experiences: [pick.experience],
    blocking_experience: pick.experience === 'fw_week_reflection' ? 'fw_week_reflection' : null,
    celebration: null,
    priority: pick.priority === 'reflection' ? 'reflection' : 'coach',
    reason: reasons,
    registry_version: opts.registryVersion || DEFAULT_REGISTRY_VERSION,
    first_week: {
      day: fwDay,
      experience: pick.experience,
      reflection_story: opts.reflectionStory || null,
    },
  };
}

function emptyContext(phase, milestones, registryVersion, reason) {
  return {
    phase: phase === 'SETTING_UP' ? 'SETTING_UP' : phase,
    milestones,
    recommended_experiences: [],
    blocking_experience: null,
    celebration: null,
    priority: 'none',
    reason,
    registry_version: registryVersion,
  };
}

function isInconsistent(milestones) {
  if (milestones.child_logged_in && (!milestones.routine_ready || !milestones.rewards_ready)) {
    if (!milestones._children_logged_in?.length) return true;
  }
  if (milestones.first_success) {
    if (!milestones.child_first_completion || !milestones.parent_saw_completion) return true;
  }
  return false;
}

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
  if (milestones.first_success) codes.push(ReasonCode.FIRST_SUCCESS_COMPLETED);
  if (!codes.length && phase === 'SETTING_UP') codes.push(ReasonCode.PHASE_SETTING_UP);
  return codes;
}

function getContextDerivation(context) {
  if (context.reason?.includes(ReasonCode.INCONSISTENT_STATE)) {
    return { rule: 'inconsistent → SETTING_UP', reason: context.reason };
  }
  if (context.blocking_experience === 'parent_ack_completion') {
    return { rule: 'child_first_completion && !parent_saw_completion', reason: context.reason };
  }
  if (context.blocking_experience === 'handoff_to_child') {
    return { rule: 'needsHandoff(phase)', reason: context.reason };
  }
  if (context.celebration) {
    return { rule: 'first_success && !celebration_shown', reason: context.reason };
  }
  if (context.priority === 'coach') {
    return { rule: 'coach projection', reason: context.reason };
  }
  return { rule: 'default', reason: context.reason };
}

module.exports = {
  DEFAULT_REGISTRY_VERSION,
  deriveContext,
  deriveReasonCodes,
  getContextDerivation,
  derivePhase,
  getPhaseDerivation,
  tryFirstWeekExperience,
};
