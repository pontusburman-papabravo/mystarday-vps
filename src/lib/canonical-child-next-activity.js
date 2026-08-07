'use strict';

/**
 * Server authority for which daily-log item is Barnets Idag "NU" (widget parity).
 * Mirrors GET /api/children/me/daily-log filtering without a frontend refactor.
 */

const db = require('./db');
const { getOrGenerateDailyLog, getLocalDateStr } = require('./daily-log-generator');
const { compareChildDailyLogItems } = require('./daily-log-child-order');
const { FLAG_KEYS, isActivationFlagEnabled } = require('./activation-flags');
const {
  countLifetimeCompletions,
  resolveFirstStarMode,
  applyFirstStarModeFilter,
} = require('./first-star-mode');
const { getFamilyPreferredLocale } = require('./family-locale');
const { ensureFirstStarStarterActivity } = require('./first-star-starter');
const { normalizeLeadMinutes, getTransitionFromStartTime } = require('./transition-support');
const { featureAccess } = require('./feature-access');

/** Same section walk as child-self NOW/NEXT/LATER tagging */
const NNL_SECTION_ORDER = ['morgon', 'dag', 'kvall', 'natt'];

function sortItemsLikeChildIdag(items) {
  return [...items].sort(compareChildDailyLogItems);
}

function buildSections(sortedItems) {
  const sections = {};
  for (const item of sortedItems) {
    if (!sections[item.section]) sections[item.section] = [];
    sections[item.section].push(item);
  }
  return sections;
}

/**
 * Pick the single primary actionable item Idag surfaces as "NU".
 * @param {object[]} sortedItems — child-sort order
 * @param {object} ctx
 * @returns {object|null}
 */
/**
 * Widget must not surface direct_complete before övergångsstöd lead window (R4.5 closure).
 * @param {object} item
 * @param {{ transitionSupportEnabled: boolean, transitionLeadMinutes: number[], now?: Date }} opts
 */
function isItemBlockedByTransitionLead(item, opts) {
  if (!opts.transitionSupportEnabled) return false;
  if (!item || item.completed) return false;
  if (!item.start_time) return false;
  const { phase } = getTransitionFromStartTime(item.start_time, {
    leadMinutes: opts.transitionLeadMinutes,
    now: opts.now || new Date(),
  });
  return phase === 'soon';
}

function pickIdagPrimaryNowItem(sortedItems, ctx, options = {}) {
  const {
    firstStarMode,
    isToday,
    viewType,
    showNowNext,
  } = ctx;
  const shouldReject = options.shouldRejectPrimary || (() => false);

  let candidate = null;

  if (firstStarMode && isToday) {
    const filtered = applyFirstStarModeFilter(sortedItems);
    candidate = filtered[0] || null;
  } else if (isToday && viewType === 'now_next_later' && showNowNext) {
    const sections = buildSections(sortedItems);
    for (const sec of NNL_SECTION_ORDER) {
      if (!sections[sec]) continue;
      for (const item of sections[sec]) {
        if (!item.completed) {
          candidate = item;
          break;
        }
      }
      if (candidate) break;
    }
  } else {
    for (const item of sortedItems) {
      if (!item.completed) {
        candidate = item;
        break;
      }
    }
  }

  if (candidate && shouldReject(candidate)) {
    return null;
  }
  return candidate;
}

async function loadChildDayContext(childId, options = {}) {
  const audience = options.audience || 'idag';
  const childRes = await db.query(
    `SELECT id, family_id, timezone, show_now_next, require_sequential_completion,
            view_type, activity_timers_enabled, transition_lead_minutes
     FROM child WHERE id = $1`,
    [childId]
  );
  const child = childRes.rows[0];
  if (!child) return null;

  const tz = child.timezone || 'Europe/Stockholm';
  const dateStr = getLocalDateStr(undefined, tz);
  const isToday = true;

  let { log, items } = await getOrGenerateDailyLog(childId, dateStr);

  const familyId = child.family_id;
  const firstStarFlagOn = await isActivationFlagEnabled(FLAG_KEYS.firstStarMode, familyId);
  if (familyId && isToday && items.length === 0 && firstStarFlagOn) {
    if (await countLifetimeCompletions(childId) === 0) {
      const locale = await getFamilyPreferredLocale(familyId);
      await ensureFirstStarStarterActivity({
        childId,
        familyId,
        dateStr,
        locale,
      });
      ({ log, items } = await getOrGenerateDailyLog(childId, dateStr));
    }
  }

  const sortedItems = sortItemsLikeChildIdag(items);
  const total = sortedItems.length;
  const completed = sortedItems.filter((i) => i.completed).length;

  let firstStarMode = false;
  if (firstStarFlagOn) {
    const lifetimeCompletions = await countLifetimeCompletions(childId);
    firstStarMode = resolveFirstStarMode({
      flagEnabled: true,
      lifetimeCompletions,
    });
  }

  const showNowNext = child.show_now_next === true;
  const viewType = child.view_type || 'day_sections';

  let transitionSupportEnabled = false;
  let transitionLeadMinutes = normalizeLeadMinutes(child.transition_lead_minutes);
  if (familyId) {
    transitionSupportEnabled = await featureAccess(familyId, 'transition_support');
  }

  const transitionOpts = {
    transitionSupportEnabled,
    transitionLeadMinutes,
    now: options.now,
  };

  const shouldRejectPrimary = audience === 'widget'
    ? (item) => isItemBlockedByTransitionLead(item, transitionOpts)
    : () => false;

  const primaryItem = pickIdagPrimaryNowItem(sortedItems, {
    firstStarMode,
    isToday,
    viewType,
    showNowNext,
  }, { shouldRejectPrimary });

  return {
    child,
    log,
    sortedItems,
    total,
    completed,
    primaryItem,
    firstStarMode,
    showNowNext,
    viewType,
    requireSequential: child.require_sequential_completion === true,
    activityTimersEnabled: child.activity_timers_enabled === true,
    familyId,
    dateStr,
    transitionSupportEnabled,
    transitionLeadMinutes,
  };
}

/**
 * @param {string} childId
 * @param {object} [options]
 * @returns {Promise<{
 *   status: 'ok'|'paused'|'all_done'|'nothing_now'|'not_found',
 *   primaryItem?: object|null,
 *   sortedItems?: object[],
 *   total?: number,
 *   completed?: number,
 *   child?: object,
 *   log?: object,
 * }>}
 */
async function resolveCanonicalChildNextActivity(childId, options = {}) {
  const ctx = await loadChildDayContext(childId, options);
  if (!ctx) {
    return { status: 'not_found' };
  }
  if (ctx.log?.is_paused) {
    return { status: 'paused', ...ctx };
  }
  if (ctx.total > 0 && ctx.completed >= ctx.total) {
    return { status: 'all_done', ...ctx };
  }
  if (ctx.total === 0) {
    return { status: 'nothing_now', ...ctx };
  }
  if (!ctx.primaryItem) {
    return { status: 'nothing_now', ...ctx };
  }
  return { status: 'ok', ...ctx };
}

module.exports = {
  NNL_SECTION_ORDER,
  sortItemsLikeChildIdag,
  pickIdagPrimaryNowItem,
  isItemBlockedByTransitionLead,
  loadChildDayContext,
  resolveCanonicalChildNextActivity,
};
