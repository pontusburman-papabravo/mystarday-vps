'use strict';

const familyMilestones = require('../../../db/family-milestones');
const { derivePhase, resolvePhaseTransition } = require('./phases');
const { FLAG_KEYS, isFlagEnabled } = require('./flags');

/** Milestones that may be written via ingest (not first_success — derived only). */
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
]);

const CLIENT_INTENTS = {
  handoff_started: 'handoff_started',
  handoff_deferred: 'handoff_deferred',
  celebration_dismissed: 'celebration_dismissed',
};

/**
 * Record a milestone and recompute phase. Idempotent.
 * @returns {Promise<{ ok: boolean, inserted: boolean, phase: string }>}
 */
async function ingestMilestone({
  familyId,
  milestone,
  childId = null,
  metadata = {},
  source = 'system',
}, client) {
  if (!familyId || !milestone) {
    return { ok: false, inserted: false, phase: 'SETTING_UP' };
  }

  if (milestone === 'first_success') {
    console.warn('[journey/ingest] first_success is derived only — ignoring direct insert');
    return { ok: false, inserted: false, phase: 'SETTING_UP' };
  }

  if (!WRITABLE_MILESTONES.has(milestone)) {
    return { ok: false, inserted: false, phase: 'SETTING_UP' };
  }

  const ingestOn = await isFlagEnabled(FLAG_KEYS.ingestEnabled);
  if (!ingestOn) {
    return { ok: true, inserted: false, phase: await familyMilestones.getJourneyPhase(familyId, client) };
  }

  const { inserted } = await familyMilestones.insertMilestone({
    familyId,
    milestone,
    childId,
    metadata,
    source,
  }, client);

  await maybeDeriveFirstSuccess(familyId, client);
  const phase = await recomputePhase(familyId, client);

  return { ok: true, inserted, phase };
}

/**
 * Handle client intent from POST /journey-context/events.
 */
async function ingestClientIntent({ familyId, intent, childId = null, metadata = {} }, client) {
  const milestone = CLIENT_INTENTS[intent];
  if (!milestone) {
    return { ok: false, error: 'unknown_intent' };
  }

  if (intent === 'celebration_dismissed') {
    const ingestOn = await isFlagEnabled(FLAG_KEYS.ingestEnabled);
    if (ingestOn) {
      await familyMilestones.markCelebrationShown(familyId, client);
    }
    return { ok: true, inserted: false };
  }

  // handoff intents only valid in FIRST_USE
  const currentPhase = await familyMilestones.getJourneyPhase(familyId, client);
  const milestones = await familyMilestones.getMilestoneMap(familyId, client);
  const derivedPhase = derivePhase(milestones);

  if (intent === 'handoff_started' || intent === 'handoff_deferred') {
    if (derivedPhase !== 'FIRST_USE' && currentPhase !== 'FIRST_USE') {
      return { ok: false, error: 'invalid_phase' };
    }
  }

  return ingestMilestone({
    familyId,
    milestone,
    childId,
    metadata,
    source: 'system',
  }, client);
}

/**
 * Derive first_success when both prerequisites exist.
 */
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

  if (inserted) {
    await familyMilestones.setJourneyPhase(familyId, 'BUILDING_ROUTINE', client);
  }
  return inserted;
}

async function recomputePhase(familyId, client) {
  const milestones = await familyMilestones.getMilestoneMap(familyId, client);
  const targetPhase = derivePhase(milestones);
  const currentPhase = await familyMilestones.getJourneyPhase(familyId, client);
  const nextPhase = resolvePhaseTransition(currentPhase, targetPhase);
  if (nextPhase !== currentPhase) {
    await familyMilestones.setJourneyPhase(familyId, nextPhase, client);
  }
  return nextPhase;
}

/**
 * Fire-and-forget wrapper for route hooks.
 */
function ingestMilestoneAsync(params) {
  ingestMilestone(params).catch((err) => {
    console.error('[journey/ingest] async error:', err.message);
  });
}

module.exports = {
  WRITABLE_MILESTONES,
  CLIENT_INTENTS,
  ingestMilestone,
  ingestClientIntent,
  maybeDeriveFirstSuccess,
  recomputePhase,
  ingestMilestoneAsync,
};
