'use strict';

/**
 * Dumb coach adapter — maps Engine output to coach card shape. No product logic.
 * @param {import('../index').EngineOutput} output
 * @param {Record<string, string>} [voiceCopy]
 */
function toCoachCard(output, voiceCopy = {}) {
  const { policy, trace } = output;
  const key = policy.name;
  const copy = voiceCopy[key] || {};
  return {
    action: policy.name,
    need: trace.evaluatedNeed,
    tone: policy.uiTokens.theme.toLowerCase(),
    headline: copy.headline || null,
    body: copy.body || null,
    cta: copy.cta || null,
    route: copy.route || null,
    trace: trace.rulesTriggered,
  };
}

module.exports = { toCoachCard };
