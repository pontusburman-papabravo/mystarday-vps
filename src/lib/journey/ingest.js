'use strict';

const familyMilestones = require('../../../db/family-milestones');
const { derivePhase, resolvePhaseTransition } = require('./phases');
const { FLAG_KEYS, isFlagEnabled } = require('./flags');

const WRITABLE_MILESTONES = new Set([
  'account_created',
  'child_created',
  'routine_ready',
  'rewards_ready',
  'handoff_started',
  'handoff_deferred',
  'child_logged_in',
  'child_first_completion',
  'parent_saw_completion',
  'established_routine',
  'child_self_sufficient_week',
  'second_child_created',
  'coparent_joined',
  'evening_routine_added',
  'first_week_day_dismissed',
  'week_reflection_completed',
  'first_month_moment_dismissed',
  'month_reflection_completed',
]);

const CLIENT_INTENTS = {
  handoff_started: 'handoff_started',
  handoff_deferred: 'handoff_deferred',
  celebration_dismissed: 'celebration_dismissed',
  parent_ack_dismissed: 'parent_saw_completion',
  first_week_dismissed: 'first_week_day_dismissed',
  week_reflection_completed: 'week_reflection_completed',
  first_month_moment_dismissed: 'first_month_moment_dismissed',
  month_reflection_completed: 'month_reflection_completed',
};

async function getPhaseOpts() {
  return {
    establishedEnabled: await isFlagEnabled(FLAG_KEYS.establishedPhase),
    expandingEnabled: await isFlagEnabled(FLAG_KEYS.expandingPhase),
    independenceEnabled: await isFlagEnabled(FLAG_KEYS.independencePhase),
  };
}

async function ingestMilestone({
  familyId,
  milestone,
  childId = null,
  scopeKey = '',
  metadata = {},
  source = 'system',
}, client) {
  if (!familyId || !milestone) {
    return { ok: false, inserted: false, phase: 'SETTING_UP' };
  }
  if (milestone === 'first_success') {
    return { ok: false, inserted: false, phase: 'SETTING_UP' };
  }
  if (!WRITABLE_MILESTONES.has(milestone)) {
    return { ok: false, inserted: false, phase: 'SETTING_UP' };
  }

  const ingestOn = await isFlagEnabled(FLAG_KEYS.ingestEnabled);
  if (!ingestOn) {
    return { ok: true, inserted: false, phase: await familyMilestones.getJourneyPhase(familyId, client) };
  }

  const sk = scopeKey || (childId ? familyMilestones.scopeKeyForChild(childId) : '');
  const { inserted } = await familyMilestones.insertMilestone({
    familyId,
    milestone,
    childId,
    scopeKey: sk,
    metadata,
    source,
  }, client);

  await maybeDeriveFirstSuccess(familyId, client);
  const phase = await recomputePhase(familyId, client);
  return { ok: true, inserted, phase };
}

async function ingestClientIntent({ familyId, intent, childId = null, metadata = {} }, client) {
  if (intent === 'celebration_dismissed') {
    const ingestOn = await isFlagEnabled(FLAG_KEYS.ingestEnabled);
    if (ingestOn) await familyMilestones.markCelebrationShown(familyId, client);
    return { ok: true, inserted: false };
  }

  if (intent === 'parent_ack_dismissed') {
    const dailyLogItemId = metadata?.daily_log_item_id;
    if (dailyLogItemId) {
      const parentSeenCompletion = require('../../../db/parent-seen-completion');
      const parentId = metadata.parent_id;
      if (parentId) {
        await parentSeenCompletion.markSeen(parentId, dailyLogItemId, client);
      }
    }
    return ingestMilestone({
      familyId,
      milestone: 'parent_saw_completion',
      metadata,
      source: 'system',
    }, client);
  }

  const milestone = CLIENT_INTENTS[intent];
  if (!milestone) return { ok: false, error: 'unknown_intent' };

  if (intent === 'first_week_dismissed') {
    const day = metadata?.day;
    if (!day || day < 1 || day > 7) return { ok: false, error: 'invalid_day' };
    return ingestMilestone({
      familyId,
      milestone,
      scopeKey: `day:${day}`,
      metadata: { day },
      source: 'system',
    }, client);
  }

  if (intent === 'week_reflection_completed') {
    return ingestMilestone({
      familyId,
      milestone: 'week_reflection_completed',
      metadata: { warmth: metadata?.warmth || null },
      source: 'system',
    }, client);
  }

  if (intent === 'first_month_moment_dismissed') {
    const moment = metadata?.moment;
    if (!moment || typeof moment !== 'string' || !moment.startsWith('fm_')) {
      return { ok: false, error: 'invalid_moment' };
    }
    return ingestMilestone({
      familyId,
      milestone: 'first_month_moment_dismissed',
      scopeKey: `moment:${moment}`,
      metadata: { moment },
      source: 'system',
    }, client);
  }

  if (intent === 'month_reflection_completed') {
    return ingestMilestone({
      familyId,
      milestone: 'month_reflection_completed',
      metadata: { warmth: metadata?.warmth || null },
      source: 'system',
    }, client);
  }

  const milestones = await familyMilestones.getMilestoneMap(familyId, client);
  const derivedPhase = derivePhase(milestones, await getPhaseOpts());
  if ((intent === 'handoff_started' || intent === 'handoff_deferred')
    && !['FIRST_USE', 'EXPANDING'].includes(derivedPhase)) {
    return { ok: false, error: 'invalid_phase' };
  }

  return ingestMilestone({
    familyId,
    milestone,
    childId,
    scopeKey: childId ? familyMilestones.scopeKeyForChild(childId) : '',
    metadata,
    source: 'system',
  }, client);
}

async function maybeDeriveFirstSuccess(familyId, client) {
  const milestones = await familyMilestones.getMilestoneMap(familyId, client);
  if (milestones.first_success) return false;
  if (!milestones.child_first_completion || !milestones.parent_saw_completion) return false;

  const occurredAt = milestones.parent_saw_completion > milestones.child_first_completion
    ? milestones.parent_saw_completion
    : milestones.child_first_completion;

  const { inserted } = await familyMilestones.insertMilestone({
    familyId,
    milestone: 'first_success',
    metadata: { derived: true },
    source: 'system',
    occurredAt,
  }, client);

  if (inserted) await familyMilestones.setJourneyPhase(familyId, 'BUILDING_ROUTINE', client);
  return inserted;
}

async function recomputePhase(familyId, client) {
  const opts = await getPhaseOpts();
  const milestones = await familyMilestones.getMilestoneMap(familyId, client);
  const targetPhase = derivePhase(milestones, opts);
  const currentPhase = await familyMilestones.getJourneyPhase(familyId, client);
  const nextPhase = resolvePhaseTransition(currentPhase, targetPhase);
  if (nextPhase !== currentPhase) {
    await familyMilestones.setJourneyPhase(familyId, nextPhase, client);
  }
  return nextPhase;
}

function ingestMilestoneAsync(params) {
  ingestMilestone(params).catch((err) => {
    console.error('[journey/ingest] async error:', err.message);
  });
}

module.exports = {
  WRITABLE_MILESTONES,
  CLIENT_INTENTS,
  getPhaseOpts,
  ingestMilestone,
  ingestClientIntent,
  maybeDeriveFirstSuccess,
  recomputePhase,
  ingestMilestoneAsync,
};
