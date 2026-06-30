'use strict';

const db = require('../db');
const { resolvePackForChild } = require('../experience-pack');
const progressionDb = require('../../../db/child-progression-node');

function queryClient(client) {
  if (!client) return db;
  if (typeof client === 'function') return { query: client };
  return client;
}
const progressionRuntime = require('./progression-runtime');
const rewardRuntime = require('./reward-runtime');
const worldRuntime = require('./world-runtime');
const eventBus = require('./event-bus');

const FLAG_KEY = 'platform_runtime_enabled';

async function isRuntimeEnabled() {
  try {
    const result = await db.query(
      'SELECT enabled FROM feature_flag WHERE key = $1 LIMIT 1',
      [FLAG_KEY]
    );
    return Boolean(result.rows[0]?.enabled);
  } catch {
    return false;
  }
}

async function gatherChildStats(childId, client) {
  const result = await queryClient(client).query(
    `SELECT COUNT(*)::int AS child_completions
     FROM daily_log_item dli
     JOIN daily_log dl ON dl.id = dli.daily_log_id
     WHERE dl.child_id = $1
       AND dli.completed = true
       AND dli.completed_by = 'child'`,
    [childId]
  );
  return {
    child_completions: result.rows[0]?.child_completions || 0,
  };
}

async function gatherChildContext(childId, dailyLogItemId, client) {
  const q = queryClient(client);
  const [childRow, activityRow] = await Promise.all([
    q.query('SELECT name, family_id FROM child WHERE id = $1', [childId]),
    dailyLogItemId
      ? q.query('SELECT name FROM daily_log_item WHERE id = $1', [dailyLogItemId])
      : Promise.resolve({ rows: [] }),
  ]);

  const child = childRow.rows[0];
  return {
    childId,
    familyId: child?.family_id,
    childName: child?.name || 'Barnet',
    activityName: activityRow.rows[0]?.name || 'en aktivitet',
    dailyLogItemId,
  };
}

/**
 * Main entry: child completed an activity.
 * Idempotent via progression_event_queue.
 */
async function handleActivityComplete({
  childId,
  familyId,
  dailyLogItemId,
  packId,
}, externalClient) {
  const enabled = await isRuntimeEnabled();
  if (!enabled) return { ok: true, skipped: true, reason: 'runtime_disabled' };

  const idempotencyKey = `activity_complete:${childId}:${dailyLogItemId}`;
  const client = externalClient || db;

  const queued = await progressionDb.enqueueEvent({
    childId,
    familyId,
    eventType: 'onActivityComplete',
    idempotencyKey,
    payload: { dailyLogItemId },
  }, client);

  if (!queued.inserted && queued.replayed) {
    return { ok: true, duplicate: true, replay: true };
  }

  const pack = resolvePackForChild(childId, packId);
  const childContext = await gatherChildContext(childId, dailyLogItemId, client);
  const stats = await gatherChildStats(childId, client);

  const context = {
    stats,
    childName: childContext.childName,
    activityName: childContext.activityName,
    dailyLogItemId,
    milestones: {},
  };

  await eventBus.emit(eventBus.EVENT_TYPES.ACTIVITY_COMPLETE, {
    childId,
    familyId: familyId || childContext.familyId,
    pack,
    context,
  });

  const rewardResult = await rewardRuntime.processRewards({
    childId,
    familyId: familyId || childContext.familyId,
    pack,
    signal: 'first_activity_complete',
    context,
  }, client);

  if (rewardResult.granted) {
    context.firstRewardGranted = true;
  }

  const progressionResult = await progressionRuntime.processProgression({
    childId,
    familyId: familyId || childContext.familyId,
    pack,
    context,
  }, client);

  const worldResult = await worldRuntime.processWorld({
    pack,
    newlyUnlocked: progressionResult.newlyUnlocked,
  });

  await progressionDb.markEventProcessed(idempotencyKey, client);

  return {
    ok: true,
    reward: rewardResult,
    progression: progressionResult,
    world: worldResult,
    pack_id: pack.manifest.pack_id,
  };
}

/**
 * Replay offline-queued events (e.g. after reconnect).
 */
async function replayPendingEvents(childId, client) {
  const enabled = await isRuntimeEnabled();
  if (!enabled) return { replayed: 0 };

  const pending = await progressionDb.listPendingEvents(childId, client);
  let replayed = 0;

  for (const event of pending) {
    if (event.event_type !== 'onActivityComplete') continue;
    const payload = event.payload || {};
    await handleActivityComplete({
      childId,
      familyId: event.family_id,
      dailyLogItemId: payload.dailyLogItemId,
    }, client);
    replayed += 1;
  }

  return { replayed };
}

async function getParentFeedback(childId, dailyLogItemId, client) {
  const q = queryClient(client);
  const feedback = await progressionDb.getFeedbackForCompletion(childId, dailyLogItemId, q);
  if (feedback) return feedback;

  const pack = resolvePackForChild(childId);
  const childContext = await gatherChildContext(childId, dailyLogItemId, q);
  const { resolveExperienceCopy } = require('../experience-pack');

  const copy = resolveExperienceCopy(pack, 'parent_ack_completion', {
    child_name: childContext.childName,
    activity_name: childContext.activityName,
  });

  return copy ? {
    source: 'experience_pack',
    pack_id: pack.manifest.pack_id,
    parent_message: copy.headline,
    headline: copy.headline,
    body: copy.body,
    cta: copy.cta,
    tone: copy.tone,
  } : null;
}

async function getChildFeedback(childId, client) {
  const pack = resolvePackForChild(childId);
  const { resolveExperienceCopy } = require('../experience-pack');
  const unlocked = await progressionDb.listUnlockedNodes(childId, client);
  const worldFeedback = worldRuntime.buildWorldFeedback(pack, unlocked.map((r) => ({
    world_slug: r.world_slug,
    node_id: r.node_id,
  })));

  const copy = resolveExperienceCopy(pack, 'child_first_completion');
  const stats = await gatherChildStats(childId, client);

  return {
    pack_id: pack.manifest.pack_id,
    is_first_completion: stats.child_completions === 1,
    world_hint: copy?.world_hint || null,
    world_feedback: worldFeedback,
    unlocked_nodes: unlocked,
  };
}

async function getCelebrationCopy(childName = 'Barnet') {
  const pack = resolvePackForChild(null);
  const { resolveExperienceCopy } = require('../experience-pack');
  const copy = resolveExperienceCopy(pack, 'celebrate_first_success', { child_name: childName });
  if (!copy) return null;
  return {
    pack_id: pack.manifest.pack_id,
    headline: copy.headline,
    body: copy.body,
    cta: copy.cta,
    tone: copy.tone,
  };
}

module.exports = {
  FLAG_KEY,
  isRuntimeEnabled,
  handleActivityComplete,
  replayPendingEvents,
  getParentFeedback,
  getChildFeedback,
  getCelebrationCopy,
  gatherChildStats,
};
