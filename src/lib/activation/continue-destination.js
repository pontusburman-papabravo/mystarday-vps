'use strict';

/**
 * Where "Fortsätt ändå" should land — based on real family state, not faked milestones.
 * @param {object} params
 * @param {string} params.stepId
 * @param {object|null} params.activationState
 * @param {boolean} params.childHasSchedule
 */
function resolveContinueDestination({ stepId, activationState, childHasSchedule }) {
  const hasChild = Boolean(activationState?.child_created_at);
  const schemaSaved = Boolean(activationState?.schema_saved_at) || childHasSchedule;
  const childAccess = Boolean(activationState?.child_access_completed_at);

  if (stepId === 'save_schedule') {
    if (!hasChild) return { url: '/onboarding', reason: 'need_child' };
    if (schemaSaved && !childAccess) return { url: '/dashboard', reason: 'child_access_next' };
    if (schemaSaved) return { url: '/dashboard', reason: 'home' };
    return { url: '/schedule', reason: 'create_schedule' };
  }

  if (stepId === 'child_access' || stepId === 'await_first_completion') {
    return { url: '/dashboard', reason: 'home' };
  }

  if (stepId === 'create_child') {
    return { url: '/dashboard', reason: 'home' };
  }

  return { url: '/dashboard', reason: 'home' };
}

module.exports = {
  resolveContinueDestination,
};
