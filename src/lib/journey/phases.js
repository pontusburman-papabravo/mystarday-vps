'use strict';

const TRANSITIONS = {
  SETTING_UP: ['FIRST_USE'],
  FIRST_USE: ['BUILDING_ROUTINE'],
  BUILDING_ROUTINE: ['ESTABLISHED_ROUTINE', 'EXPANDING'],
  ESTABLISHED_ROUTINE: ['EXPANDING', 'INDEPENDENCE'],
  EXPANDING: ['ESTABLISHED_ROUTINE', 'INDEPENDENCE'],
  INDEPENDENCE: [],
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
 * @param {Record<string, unknown>} milestones
 * @param {{ establishedEnabled?: boolean, expandingEnabled?: boolean, independenceEnabled?: boolean }} opts
 */
function derivePhase(milestones, opts = {}) {
  if (!milestones || typeof milestones !== 'object') return 'SETTING_UP';

  if (opts.independenceEnabled && milestones.child_self_sufficient_week) {
    return 'INDEPENDENCE';
  }
  if (opts.expandingEnabled && (milestones.second_child_created || milestones.coparent_joined)) {
    return 'EXPANDING';
  }
  if (opts.establishedEnabled && milestones.established_routine) {
    return 'ESTABLISHED_ROUTINE';
  }
  if (milestones.first_success) return 'BUILDING_ROUTINE';
  if (milestones.routine_ready && milestones.rewards_ready) return 'FIRST_USE';
  return 'SETTING_UP';
}

function resolvePhaseTransition(currentPhase, targetPhase) {
  const currentIdx = PHASE_ORDER.indexOf(currentPhase);
  const targetIdx = PHASE_ORDER.indexOf(targetPhase);
  if (currentIdx < 0 || targetIdx < 0) return 'SETTING_UP';
  if (targetIdx <= currentIdx) return currentPhase;
  const allowed = TRANSITIONS[currentPhase];
  if (allowed && allowed.includes(targetPhase)) return targetPhase;
  if (targetPhase === 'BUILDING_ROUTINE' && currentPhase === 'FIRST_USE') return 'BUILDING_ROUTINE';
  if (targetPhase === 'EXPANDING' && ['BUILDING_ROUTINE', 'ESTABLISHED_ROUTINE'].includes(currentPhase)) {
    return 'EXPANDING';
  }
  return currentPhase;
}

function getPhaseDerivation(milestones, opts = {}) {
  const phase = derivePhase(milestones, opts);
  const rules = {
    INDEPENDENCE: 'child_self_sufficient_week → INDEPENDENCE',
    EXPANDING: 'second_child_created | coparent_joined → EXPANDING',
    ESTABLISHED_ROUTINE: 'established_routine → ESTABLISHED_ROUTINE',
    BUILDING_ROUTINE: 'first_success → BUILDING_ROUTINE',
    FIRST_USE: 'routine_ready && rewards_ready → FIRST_USE',
    SETTING_UP: 'default → SETTING_UP',
  };
  return {
    rule: rules[phase] || rules.SETTING_UP,
    milestones_considered: Object.keys(milestones).filter((k) => !k.startsWith('_')),
    derived_phase: phase,
  };
}

function needsHandoff(milestones, phase) {
  const loggedIn = new Set(milestones._children_logged_in || []);
  if (phase === 'FIRST_USE') return loggedIn.size === 0;
  if (phase === 'EXPANDING' && milestones._pending_handoff_child_id) {
    return !loggedIn.has(milestones._pending_handoff_child_id);
  }
  return false;
}

module.exports = {
  TRANSITIONS,
  PHASE_ORDER,
  derivePhase,
  resolvePhaseTransition,
  getPhaseDerivation,
  needsHandoff,
};
