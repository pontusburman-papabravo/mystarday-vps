'use strict';

const analytics = require('../../db/analytics');

/**
 * Async trace logging — never blocks the request path.
 * @param {string} familyId
 * @param {import('../core-engine').EngineOutput} output
 */
function queueEngineTrace(familyId, output) {
  if (!familyId || !output?.trace) return;

  const payload = {
    coreState: output.trace.coreState,
    evaluatedNeed: output.trace.evaluatedNeed,
    activePolicy: output.trace.activePolicy,
    policySet: output.trace.policySet,
    rulesTriggered: output.trace.rulesTriggered,
    directiveId: output.policy?.id,
    milestone: output.milestone,
  };

  globalThis.setImmediate(() => {
    analytics.track(familyId, 'engine_decision_trace', payload).catch(() => {});
  });
}

module.exports = { queueEngineTrace };
