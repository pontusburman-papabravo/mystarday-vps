'use strict';

/**
 * Dumb UI adapter — applies emotion tokens only. No decisions.
 * @param {import('../../index').EngineOutput} output
 */
function toUiPresentation(output) {
  const { policy, milestone } = output;
  return {
    action: policy.name,
    theme: policy.uiTokens.theme,
    intensity: policy.uiTokens.intensity,
    tags: [...policy.uiTokens.tags],
    milestone,
    showCelebration: policy.uiTokens.theme === 'CELEBRATION' || milestone === 'first_success',
  };
}

module.exports = { toUiPresentation };
