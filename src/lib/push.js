/**
 * Web Push trigger helpers.
 * Owns: high-level notification triggers with preference checks + activity-completion debounce.
 * Delegates sending to push-notifications.js (VAPID + web-push).
 * Does NOT own: subscription storage, VAPID configuration.
 */

const db = require('./db');
const { sendPushNotification } = require('./push-notifications');
const { t } = require('./i18n');
const { validateLocale } = require('./locale');
const { resolveCommunicationLocale } = require('./communication-locale');

/**
 * Get all parents in a family with their push_preferences and locale.
 */
async function getFamilyParents(familyId) {
  try {
    const result = await db.query(
      `SELECT p.id, p.push_preferences, p.admin_push_enabled,
              COALESCE(f.preferred_locale, 'sv-SE') AS preferred_locale
       FROM parent p
       JOIN family f ON f.id = p.family_id
       WHERE p.family_id = $1`,
      [familyId]
    );
    return result.rows;
  } catch (_) {
    return [];
  }
}

function isPushEnabled(parent) {
  const prefs = parent.push_preferences || {};
  return prefs.enabled === true;
}

function isPushEnabledForChild(parent, childId) {
  if (!isPushEnabled(parent)) return false;
  const prefs = parent.push_preferences || {};
  const perChild = prefs.per_child || {};
  return perChild[String(childId)] !== false;
}

function parentLocale(parent) {
  return resolveCommunicationLocale(parent.preferred_locale);
}

// ── Activity-completion debounce ─────────────────────────────────────────────
// In-memory map: `${familyId}:${childId}` → { timer, count, childName, activities[] }
// If a child completes 3+ activities within 2 minutes, coalesce into one summary push.
const DEBOUNCE_MS = 2 * 60 * 1000; // 2 minutes
const BATCH_THRESHOLD = 3;
const _pendingCompletions = new Map();

function _flushCompletionBatch(key, familyId, childId, excludeParentId) {
  const pending = _pendingCompletions.get(key);
  if (!pending) return;
  _pendingCompletions.delete(key);

  const { childName, activities } = pending;
  let title, body;

  if (activities.length >= BATCH_THRESHOLD) {
    _sendParentsPush(
      familyId,
      childId,
      excludeParentId,
      (lang) => t(lang, 'push.activityComplete.title', { childName }),
      (lang) => t(lang, 'push.activityComplete.bodyBatch', { count: String(activities.length) })
    );
    return;
  }

  for (const activityName of activities) {
    _sendParentsPush(
      familyId,
      childId,
      excludeParentId,
      (lang) => t(lang, 'push.activityComplete.title', { childName }),
      (lang) => t(lang, 'push.activityComplete.bodySingle', { activityName })
    );
  }
}

async function _sendParentsPush(familyId, childId, excludeParentId, titleFn, bodyFn) {
  try {
    const parents = await getFamilyParents(familyId);
    for (const parent of parents) {
      if (excludeParentId && parent.id === excludeParentId) continue;
      if (!isPushEnabledForChild(parent, childId)) continue;
      const lang = parentLocale(parent);
      sendPushNotification(parent.id, {
        title: titleFn(lang),
        body: bodyFn(lang),
        icon: '/icon-192.png',
        url: '/dashboard',
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[PUSH] _sendParentsPush error:', err.message);
  }
}

/**
 * Notify parents when a child (or parent on behalf of child) completes an activity.
 */
async function notifyParentsChildCompleted(familyId, childId, childName, activityName, excludeParentId = null) {
  try {
    const key = `${familyId}:${childId}`;
    const existing = _pendingCompletions.get(key);

    if (existing) {
      clearTimeout(existing.timer);
      existing.activities.push(activityName);
      existing.timer = setTimeout(() => _flushCompletionBatch(key, familyId, childId, excludeParentId), DEBOUNCE_MS);

      if (existing.activities.length === BATCH_THRESHOLD) {
        clearTimeout(existing.timer);
        _flushCompletionBatch(key, familyId, childId, excludeParentId);
      }
    } else {
      const timer = setTimeout(() => _flushCompletionBatch(key, familyId, childId, excludeParentId), DEBOUNCE_MS);
      _pendingCompletions.set(key, {
        timer,
        childName,
        activities: [activityName],
      });
    }
  } catch (err) {
    console.error('[PUSH] notifyParentsChildCompleted error:', err.message);
  }
}

/**
 * Notify parents when a star is granted to a child.
 */
async function notifyChildStarGranted(childId, childName, starCount, parentName) {
  try {
    const result = await db.query('SELECT family_id FROM child WHERE id = $1', [childId]);
    if (!result.rows[0]) return;
    const familyId = result.rows[0].family_id;
    const parents = await getFamilyParents(familyId);
    const starLabelKey = starCount > 1 ? 'push.starLabelMany' : 'push.starLabelOne';
    for (const parent of parents) {
      if (!isPushEnabled(parent)) continue;
      const lang = parentLocale(parent);
      const starLabel = t(lang, starLabelKey);
      sendPushNotification(parent.id, {
        title: t(lang, 'push.starGranted.title', { starCount: String(starCount), childName }),
        body: t(lang, 'push.starGranted.body', {
          parentName,
          childName,
          starCount: String(starCount),
          starLabel,
        }),
        icon: '/icon-192.png',
        url: '/dashboard',
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[PUSH] notifyChildStarGranted error:', err.message);
  }
}

/**
 * Notify all parents in a family when a child requests a reward redemption.
 */
async function notifyParentsRewardRequest(familyId, childId, childName, rewardName) {
  try {
    const parents = await getFamilyParents(familyId);
    for (const parent of parents) {
      if (!isPushEnabledForChild(parent, childId)) continue;
      const lang = parentLocale(parent);
      sendPushNotification(parent.id, {
        title: t(lang, 'push.rewardRequest.title', { childName }),
        body: t(lang, 'push.rewardRequest.body', { childName, rewardName }),
        icon: '/icon-192.png',
        url: '/dashboard',
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[PUSH] notifyParentsRewardRequest error:', err.message);
  }
}

module.exports = {
  notifyParentsChildCompleted,
  notifyChildStarGranted,
  notifyParentsRewardRequest,
};
