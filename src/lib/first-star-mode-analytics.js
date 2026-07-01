'use strict';

/**
 * First Star Mode observability — server-side analytics only.
 * Gated on activation_first_star_mode_v1; fire-and-forget; never throws.
 */

const db = require('./db');
const analytics = require('../../db/analytics');
const { FLAG_KEYS, isActivationFlagEnabled } = require('./activation-flags');
const { countLifetimeCompletions } = require('./first-star-mode');
const {
  ANALYTICS_EVENT_CHILD_LOGIN,
  ANALYTICS_EVENT_ACTIVITY_COMPLETED,
} = require('./constants');

const EVENT_FIRST_STAR_MODE_SHOWN = 'first_star_mode_shown';
const EVENT_FIRST_COMPLETION = 'first_completion';
const EVENT_FIRST_STAR_MODE_EXITED = 'first_star_mode_exited';

async function isFirstStarModeFlagOn(familyId) {
  return isActivationFlagEnabled(FLAG_KEYS.firstStarMode, familyId);
}

/**
 * @param {string} familyId
 * @param {string} eventType
 * @param {string} childId
 * @param {import('pg').PoolClient|typeof db} [client]
 */
async function hasChildEvent(familyId, eventType, childId, client = db) {
  const result = await client.query(
    `SELECT 1 FROM analytics_events
     WHERE family_id = $1
       AND event_type = $2
       AND metadata->>'child_id' = $3
     LIMIT 1`,
    [familyId, eventType, String(childId)]
  );
  return result.rows.length > 0;
}

async function maybeTrackChildLogin({ familyId, childId }) {
  if (!familyId || !childId) return;
  try {
    if (!await isFirstStarModeFlagOn(familyId)) return;
    await analytics.track(familyId, ANALYTICS_EVENT_CHILD_LOGIN, {
      child_id: String(childId),
      source: 'child_login',
    });
  } catch (err) {
    console.error('[first-star-analytics] child_login error:', err.message);
  }
}

async function maybeTrackFirstStarModeShown({ familyId, childId }) {
  if (!familyId || !childId) return;
  try {
    if (!await isFirstStarModeFlagOn(familyId)) return;
    if (await hasChildEvent(familyId, EVENT_FIRST_STAR_MODE_SHOWN, childId)) return;
    const lifetime = await countLifetimeCompletions(childId);
    if (lifetime > 0) return;
    await analytics.track(familyId, EVENT_FIRST_STAR_MODE_SHOWN, {
      child_id: String(childId),
      source: 'child_daily_log',
    });
  } catch (err) {
    console.error('[first-star-analytics] first_star_mode_shown error:', err.message);
  }
}

/**
 * Track completion funnel while child is still in first-star mode (0 lifetime completions before this one).
 * @param {{ familyId: string, childId: string, dailyLogItemId: string, lifetimeCompletionsBefore: number }} params
 */
async function maybeTrackFirstStarModeActivity({
  familyId,
  childId,
  dailyLogItemId,
  lifetimeCompletionsBefore,
}) {
  if (!familyId || !childId || !dailyLogItemId) return;
  try {
    if (!await isFirstStarModeFlagOn(familyId)) return;
    if (lifetimeCompletionsBefore > 0) return;

    const meta = {
      child_id: String(childId),
      source: 'child',
      daily_log_item_id: String(dailyLogItemId),
    };

    await analytics.track(familyId, ANALYTICS_EVENT_ACTIVITY_COMPLETED, meta);

    if (!await hasChildEvent(familyId, EVENT_FIRST_COMPLETION, childId)) {
      await analytics.track(familyId, EVENT_FIRST_COMPLETION, meta);
    }

    if (!await hasChildEvent(familyId, EVENT_FIRST_STAR_MODE_EXITED, childId)) {
      await analytics.track(familyId, EVENT_FIRST_STAR_MODE_EXITED, {
        ...meta,
        reason: 'first_completion',
      });
    }
  } catch (err) {
    console.error('[first-star-analytics] activity events error:', err.message);
  }
}

module.exports = {
  EVENT_FIRST_STAR_MODE_SHOWN,
  EVENT_FIRST_COMPLETION,
  EVENT_FIRST_STAR_MODE_EXITED,
  hasChildEvent,
  maybeTrackChildLogin,
  maybeTrackFirstStarModeShown,
  maybeTrackFirstStarModeActivity,
};
