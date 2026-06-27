'use strict';

/**
 * JSON serialization only — no business logic, no field remapping.
 * Dates → ISO strings. Arrays shallow-copied for JSON safety.
 */

/**
 * @param {import('./index').EngineOutput} output
 * @returns {Record<string, unknown>}
 */
function serializeEngineOutput(output) {
  return {
    timestamp: output.timestamp.toISOString(),
    policy: {
      id: output.policy.id,
      name: output.policy.name,
      validityWindow: {
        startHour: output.policy.validityWindow.startHour,
        endHour: output.policy.validityWindow.endHour,
        expiresAt: output.policy.validityWindow.expiresAt.toISOString(),
      },
      uiTokens: {
        theme: output.policy.uiTokens.theme,
        intensity: output.policy.uiTokens.intensity,
        tags: [...output.policy.uiTokens.tags],
      },
    },
    milestone: output.milestone,
    trace: {
      coreState: output.trace.coreState,
      evaluatedNeed: output.trace.evaluatedNeed,
      activePolicy: output.trace.activePolicy,
      rulesTriggered: [...output.trace.rulesTriggered],
      policySet: output.trace.policySet,
    },
  };
}

module.exports = { serializeEngineOutput };
