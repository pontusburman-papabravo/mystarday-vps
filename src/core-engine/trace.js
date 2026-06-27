'use strict';

/**
 * Explainability: every decision is traceable. Prevents shadow logic in logs/UI.
 * @param {import('./1-facts/types').FamilyFacts} facts
 * @param {import('./2-inference/infer').InferenceFlags} inf
 * @param {import('./constants').CoreState} state
 * @param {import('./constants').PrimaryNeed} need
 * @returns {string[]}
 */
function generateTraceLog(facts, inf, state, need) {
  const traces = [];
  if (facts._incomplete) traces.push('fact:incomplete_data');
  if (facts.hasRoutine) traces.push('fact:has_routine');
  if (facts.hasSeenChildView) traces.push('fact:child_view_true');
  if (facts.hasEveningRoutine) traces.push('fact:evening_routine_true');
  if (inf.hasFirstSuccess) traces.push('inf:first_success_true');
  if (inf.isStagnant) traces.push('inf:stagnant_true');
  if (inf.isNewUser) traces.push('inf:new_user_true');
  if (inf.hasActiveLoop) traces.push('inf:active_loop_true');
  if (inf.daysSinceSignup < 2) traces.push('day_2_post_signup');
  if (!facts.hasEveningRoutine && inf.hasFirstSuccess) traces.push('no_evening_routine');
  if (facts.firstCompletionAt) traces.push('first_activity_exists');
  traces.push(`state:${state}`);
  traces.push(`need:${need}`);
  return traces;
}

module.exports = { generateTraceLog };
