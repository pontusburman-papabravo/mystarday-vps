'use strict';

const familyMilestones = require('../../../db/family-milestones');
const { deriveContext } = require('./evaluator');
const { loadRegistry } = require('./registry');
const { FLAG_KEYS, isFlagEnabled } = require('./flags');
const { getPhaseOpts } = require('./ingest');

async function buildContextForFamily(familyId, { pedagogSkip = false } = {}) {
  const evaluatorOn = await isFlagEnabled(FLAG_KEYS.evaluatorEnabled);
  const phase = await familyMilestones.getJourneyPhase(familyId);
  const milestones = await familyMilestones.getMilestoneMap(familyId);
  const registry = await loadRegistry({
    useDb: await isFlagEnabled(FLAG_KEYS.registryV2),
  });

  const capabilities = {
    handoff_v2: await isFlagEnabled(FLAG_KEYS.handoffV2),
    coach_v1: await isFlagEnabled(FLAG_KEYS.coachV1),
    parent_ack_v1: await isFlagEnabled(FLAG_KEYS.parentAckV1),
    activation_ui_removed: await isFlagEnabled(FLAG_KEYS.activationUiRemoved),
  };

  if (!evaluatorOn) {
    return {
      phase,
      milestones,
      recommended_experiences: [],
      blocking_experience: null,
      celebration: null,
      priority: 'none',
      reason: [],
      registry_version: registry.version,
      capabilities,
    };
  }

  const phaseOpts = await getPhaseOpts();
  const coachEnabled = capabilities.coach_v1;

  return {
    ...deriveContext({
      phase,
      milestones,
      registryVersion: registry.version,
      opts: {
        ...phaseOpts,
        coachEnabled,
        pedagogSkip,
      },
    }),
    capabilities,
  };
}

module.exports = { buildContextForFamily };
