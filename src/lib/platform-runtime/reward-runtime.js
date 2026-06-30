'use strict';

const { getRewardBySignal, interpolateTemplate, resolveExperienceCopy } = require('../experience-pack');
const progressionDb = require('../../../db/child-progression-node');
const eventBus = require('./event-bus');

async function processRewards({ childId, familyId, pack, signal, context }, client) {
  const reward = getRewardBySignal(pack, signal);
  if (!reward) return { granted: false };

  const idempotencyKey = `reward:${reward.reward_id}:${childId}`;
  const existing = await progressionDb.getPendingFeedback(childId, idempotencyKey, client);
  if (existing) return { granted: false, duplicate: true, feedback: existing };

  const vars = {
    child_name: context.childName || 'Barnet',
    activity_name: context.activityName || 'en aktivitet',
  };

  const ackCopy = resolveExperienceCopy(pack, 'parent_ack_completion', vars);
  const feedback = {
    reward_id: reward.reward_id,
    parent_message: interpolateTemplate(reward.parent_message_template, vars),
    headline: ackCopy?.headline || interpolateTemplate(reward.parent_message_template, vars),
    body: ackCopy?.body || null,
    cta: ackCopy?.cta || 'Det ser jag',
    tone: ackCopy?.tone || 'warm',
    celebration_theme: reward.celebration_theme,
    celebration_max_ms: reward.celebration_max_ms,
    pack_config_key: reward.pack_config_key,
  };

  await progressionDb.storePendingFeedback({
    childId,
    familyId,
    idempotencyKey,
    feedbackType: 'reward',
    payload: feedback,
    dailyLogItemId: context.dailyLogItemId || null,
  }, client);

  await eventBus.emit(eventBus.EVENT_TYPES.REWARD_GRANTED, {
    childId,
    familyId,
    reward,
    feedback,
  });

  return { granted: true, feedback };
}

module.exports = {
  processRewards,
};
