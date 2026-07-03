'use strict';

const db = require('./db');

/** Draft copy — Parent HRC (BL-042) may revise before parent UI ships. */
const WARM_ECHO_COPY = {
  first_reward_remembered: {
    emoji: '🎁',
    title: 'Ett mjukt minne',
    subtitle: 'Från en bra dag',
    toast: 'Du minns något fint du fick — det var en bra dag.',
  },
  first_week_complete: {
    emoji: '🌟',
    title: 'Ett mjukt minne',
    subtitle: 'Från en bra vecka',
    toast: 'Du har hållit igång en bra stund — det betyder något.',
  },
};

const MILESTONE_PRIORITY = ['first_week_complete', 'first_reward_remembered'];

function readWarmEchoConfig(childViewConfig) {
  const cfg = childViewConfig && typeof childViewConfig === 'object'
    ? childViewConfig
    : {};
  const hall = cfg.memory_hall && typeof cfg.memory_hall === 'object'
    ? cfg.memory_hall
    : {};
  return {
    enabled: hall.warm_echo_enabled === true,
    optedInAt: hall.warm_echo_opted_in_at || null,
    optedInByParentId: hall.warm_echo_opted_in_by_parent_id || null,
  };
}

async function hasRememberedReward(childId) {
  const r = await db.query(
    `SELECT 1 FROM reward_redemption
     WHERE child_id = $1 AND status IN ('approved', 'auto')
     LIMIT 1`,
    [childId]
  );
  return r.rows.length > 0;
}

async function hasSevenDistinctCompletionDays(childId) {
  const r = await db.query(
    `SELECT COUNT(DISTINCT dli.completed_date) AS day_count
     FROM daily_log_item dli
     JOIN daily_log dl ON dl.id = dli.daily_log_id
     WHERE dl.child_id = $1
       AND dli.completed = true
       AND dli.completed_date IS NOT NULL`,
    [childId]
  );
  const count = Number(r.rows[0]?.day_count || 0);
  return count >= 7;
}

async function findQualifyingMilestone(childId) {
  const checks = await Promise.all([
    hasSevenDistinctCompletionDays(childId).then(function (ok) {
      return ok ? 'first_week_complete' : null;
    }),
    hasRememberedReward(childId).then(function (ok) {
      return ok ? 'first_reward_remembered' : null;
    }),
  ]);

  for (let i = 0; i < MILESTONE_PRIORITY.length; i += 1) {
    const key = MILESTONE_PRIORITY[i];
    if (checks.includes(key)) return key;
  }
  return null;
}

function buildWarmEchoExhibit(milestoneKey) {
  const copy = WARM_ECHO_COPY[milestoneKey];
  if (!copy) return null;

  return {
    slot_id: 'warm_echo_' + milestoneKey,
    slot_type: 'warm_echo',
    label_sv: copy.title,
    visual_token: 'frame_glow',
    content: {
      kind: 'warm_echo',
      emoji: copy.emoji,
      title: copy.title,
      subtitle: copy.subtitle,
      toast: copy.toast,
      tone: 'warm_echo',
      milestone_key: milestoneKey,
    },
    source: {
      kind: 'milestone',
      milestone_key: milestoneKey,
    },
    parent_opt_in: true,
  };
}

/**
 * Returns at most one warm_echo exhibit when parent opt-in is enabled
 * and a non-streak milestone qualifies.
 */
async function resolveWarmEchoExhibit(childId, childViewConfig) {
  const config = readWarmEchoConfig(childViewConfig);
  if (!config.enabled) return null;

  const milestoneKey = await findQualifyingMilestone(childId);
  if (!milestoneKey) return null;

  return buildWarmEchoExhibit(milestoneKey);
}

module.exports = {
  WARM_ECHO_COPY,
  readWarmEchoConfig,
  findQualifyingMilestone,
  resolveWarmEchoExhibit,
  buildWarmEchoExhibit,
};
