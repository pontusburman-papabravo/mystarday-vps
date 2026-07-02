'use strict';

/**
 * Handoff banner visibility — Fas 2 uses blocking_experience only.
 */
function contextWantsHandoff(ctx) {
  if (!ctx) return false;
  if (ctx.capabilities?.handoff_v2) {
    return ctx.blocking_experience === 'handoff_to_child';
  }
  if (ctx.blocking_experience === 'handoff_to_child') return true;
  return ctx.priority === 'handoff'
    && Array.isArray(ctx.recommended_experiences)
    && ctx.recommended_experiences.includes('handoff_to_child');
}

module.exports = { contextWantsHandoff };
