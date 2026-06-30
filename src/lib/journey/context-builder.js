'use strict';

const familyMilestones = require('../../../db/family-milestones');
const { deriveContext } = require('./evaluator');
const { loadRegistry } = require('./registry');
const { FLAG_KEYS, isFlagEnabled } = require('./flags');
const { getPhaseOpts } = require('./ingest');
const {
  buildFirstWeekContext,
  effectiveFirstWeekDay,
} = require('./first-week');

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
    first_week_v1: await isFlagEnabled(FLAG_KEYS.firstWeekV1),
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
  const firstWeekEnabled = capabilities.first_week_v1;

  let firstWeekBlock = null;
  let firstWeekOpts = {};
  if (firstWeekEnabled && milestones.first_success) {
    firstWeekBlock = await buildFirstWeekContext(familyId, milestones);
    const celebrationShown = Boolean(milestones._celebration_shown);
    const fsAt = milestones.first_success ? new Date(milestones.first_success) : null;
    const tz = firstWeekBlock.signals?.timezone || 'Europe/Stockholm';
    const effectiveDay = effectiveFirstWeekDay(fsAt, new Date(), tz, celebrationShown);
    firstWeekOpts = {
      firstWeekEnabled: true,
      firstWeekDay: effectiveDay || firstWeekBlock.effective_day || firstWeekBlock.day,
      firstWeekSignals: {
        missedYesterday: firstWeekBlock.signals?.missed_yesterday,
        missedTwoDays: firstWeekBlock.signals?.missed_two_days,
        childLoggedInToday: firstWeekBlock.signals?.child_logged_in_today,
        hasNewDiscovery: firstWeekBlock.signals?.has_new_discovery,
      },
      timezone: firstWeekBlock.signals?.timezone,
      reflectionStory: firstWeekBlock.reflection_story,
    };
  }

  const context = {
    ...deriveContext({
      phase,
      milestones,
      registryVersion: registry.version,
      opts: {
        ...phaseOpts,
        coachEnabled,
        pedagogSkip,
        ...firstWeekOpts,
      },
    }),
    capabilities,
  };

  if (firstWeekBlock) {
    context.first_week = firstWeekBlock;
    context.activation_program_suppressed = Boolean(
      firstWeekEnabled && firstWeekBlock.active
    );
  }

  return enrichCelebrationCopy(familyId, context);
}

async function enrichCelebrationCopy(familyId, context) {
  if (context.celebration !== 'celebrate_first_success') return context;

  const platformRuntime = require('../platform-runtime');
  if (!(await platformRuntime.isRuntimeEnabled())) return context;

  let childName = 'Barnet';
  const rows = await familyMilestones.listRaw(familyId);
  const completion = rows.find((r) => r.milestone === 'child_first_completion');
  if (completion?.child_id) {
    const db = require('../db');
    const childRow = await db.query('SELECT name FROM child WHERE id = $1', [completion.child_id]);
    childName = childRow.rows[0]?.name || childName;
  }

  return {
    ...context,
    celebration_copy: await platformRuntime.getCelebrationCopy(childName),
  };
}

module.exports = { buildContextForFamily };
