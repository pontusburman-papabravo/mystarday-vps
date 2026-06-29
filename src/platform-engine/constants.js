'use strict';

/** ADR-005 core event names — age-agnostic, no PII in analytics-bound payloads. */
const CORE_EVENTS = Object.freeze([
  'onActivityComplete',
  'onStarGranted',
  'onProgressionNodeUnlocked',
  'onWorldEnter',
  'onWorldExit',
  'onMilestone',
  'onNpcInteraction',
  'interaction.completed',
  'save.captured',
  'sync.completed',
]);

const HANDLER_BUDGET_MS = 2;

const ENGINE_STATES = Object.freeze({
  COLD: 'cold',
  LOADING: 'loading',
  READY: 'ready',
  RUNNING: 'running',
  SHUTTING_DOWN: 'shutting_down',
  TERMINATED: 'terminated',
});

const DEFAULT_PACK_ID = 'child_se';

module.exports = {
  CORE_EVENTS,
  HANDLER_BUDGET_MS,
  ENGINE_STATES,
  DEFAULT_PACK_ID,
};
