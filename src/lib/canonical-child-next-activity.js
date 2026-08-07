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
function pickIdagPrimaryNowItem(sortedItems, ctx) {
  const {
    firstStarMode,
    isToday,
    viewType,
    showNowNext,
  } = ctx;

  if (firstStarMode && isToday) {
    const filtered = applyFirstStarModeFilter(sortedItems);
    return filtered[0] || null;
  }

  if (isToday && viewType === 'now_next_later' && showNowNext) {
    const sections = buildSections(sortedItems);
    for (const sec of NNL_SECTION_ORDER) {
      if (!sections[sec]) continue;
      for (const item of sections[sec]) {
        if (!item.completed) return item;
      }
    }
    return null;
  }

  for (const item of sortedItems) {
    if (!item.completed) return item;
  }
  return null;
}

async function loadChildDayContext(childId) {
  const childRes = await db.query(
    `SELECT id, family_id, timezone, show_now_next, require_sequential_completion,
            view_type, activity_timers_enabled
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

  const primaryItem = pickIdagPrimaryNowItem(sortedItems, {
    firstStarMode,
    isToday,
    viewType,
    showNowNext,
  });

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
async function resolveCanonicalChildNextActivity(childId) {
  const ctx = await loadChildDayContext(childId);
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
  loadChildDayContext,
  resolveCanonicalChildNextActivity,
};
