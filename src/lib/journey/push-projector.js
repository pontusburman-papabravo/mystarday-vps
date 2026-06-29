'use strict';

const { buildContextForFamily } = require('./context-builder');
const { FLAG_KEYS, isFlagEnabled } = require('./flags');

const PUSH_EXPERIENCE_PREFIX = 'push_';

/**
 * Read Context and return push payload if a push experience is recommended.
 * Schedulers MUST NOT implement their own UX rules.
 */
async function projectPushForFamily(familyId) {
  const pushOn = await isFlagEnabled(FLAG_KEYS.pushV1);
  if (!pushOn || !familyId) return null;

  const context = await buildContextForFamily(familyId);
  const pushKey = (context.recommended_experiences || []).find((k) => k.startsWith(PUSH_EXPERIENCE_PREFIX));
  if (!pushKey) return null;
  if (context.blocking_experience || context.celebration) return null;

  return {
    familyId,
    experienceKey: pushKey,
    phase: context.phase,
    priority: context.priority,
    title: pushKey,
    body: `Journey push: ${pushKey}`,
  };
}

module.exports = { projectPushForFamily, PUSH_EXPERIENCE_PREFIX };
