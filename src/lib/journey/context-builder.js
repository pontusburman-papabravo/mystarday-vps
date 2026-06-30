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
const {
  buildFirstMonthContext,
  effectiveFirstMonthDay,
} = require('./first-month');

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
    first_month_v1: await isFlagEnabled(FLAG_KEYS.firstMonthV1),
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
  const firstMonthEnabled = capabilities.first_month_v1;

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

  let firstMonthBlock = null;
  let firstMonthOpts = {};
  if (firstMonthEnabled && milestones.first_success) {
    firstMonthBlock = await buildFirstMonthContext(familyId, milestones);
    const celebrationShown = Boolean(milestones._celebration_shown);
    const fsAt = milestones.first_success ? new Date(milestones.first_success) : null;
    const tz = firstMonthBlock.signals?.timezone || 'Europe/Stockholm';
    const effectiveDay = effectiveFirstMonthDay(fsAt, new Date(), tz, celebrationShown);
    firstMonthOpts = {
      firstMonthEnabled: true,
      firstMonthDay: effectiveDay || firstMonthBlock.effective_day || firstMonthBlock.day,
      firstMonthSignals: {
        hasCustomActivity: firstMonthBlock.signals?.has_custom_activity,
        calmWeek: firstMonthBlock.signals?.calm_week,
        childLedWeek: firstMonthBlock.signals?.child_led_week,
        returnedFromGap: firstMonthBlock.signals?.returned_from_gap,
        childCount: firstMonthBlock.signals?.child_count,
        hasNewDiscovery: firstMonthBlock.signals?.has_new_discovery,
        childSelfMorningDays: firstMonthBlock.signals?.child_self_morning_days,
        siblingActivity: firstMonthBlock.signals?.sibling_activity,
        coparentJoined: firstMonthBlock.signals?.coparent_joined,
        coparentWithin48h: firstMonthBlock.signals?.coparent_within_48h,
        hasTradition: firstMonthBlock.signals?.has_tradition,
        missedYesterday: firstMonthBlock.signals?.missed_yesterday,
        missedTwoDays: firstMonthBlock.signals?.missed_two_days,
      },
      timezone: firstMonthBlock.signals?.timezone,
      affirmationStory: firstMonthBlock.affirmation_story,
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
        ...firstMonthOpts,
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

  if (firstMonthBlock) {
    context.first_month = firstMonthBlock;
    if (firstMonthEnabled && firstMonthBlock.active) {
      context.activation_program_suppressed = true;
    }
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
