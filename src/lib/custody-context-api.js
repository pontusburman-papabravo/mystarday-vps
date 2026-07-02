'use strict';

const { getWeekMondayIso } = require('./date-utils');
const {
  loadCustodyContext,
  resolveCustodyDateSync,
} = require('./custody-schedule-engine');

const CONTEXT_RANGE_MAX_DAYS = 28;

/** @deprecated API legacy — keep until clients stop reading week_variant aliases. */
const LEGACY_API_FIELDS = Object.freeze([
  'variant',
  'home',
  'weekBanner',
  'isMyDay',
  'nextHandoff',
  'previousHandoff',
]);

/**
 * API legacy alias — maps activeHome.id to a/b for alternate_weeks consumers on week_variant.
 * Resolution uses engine only; never call for date logic.
 * @param {object|null} schedule
 * @param {{ id: string }|null} activeHome
 * @returns {'a'|'b'|null}
 */
function legacyWeekVariant(schedule, activeHome) {
  if (!schedule || !activeHome || schedule.pattern_type !== 'alternate_weeks') {
    return null;
  }
  const config = schedule.configuration || {};
  const homeA = config.home_a || schedule.week_a_home_id;
  if (!homeA) return null;
  return activeHome.id === homeA ? 'a' : 'b';
}

/**
 * API legacy week banner shape for calendar-week consumers.
 * @param {{ label: string, color: string }|null} weekBannerHome
 * @param {object} schedule
 */
function legacyWeekBanner(weekBannerHome, schedule) {
  if (!weekBannerHome) return null;
  return {
    label: weekBannerHome.label,
    color: weekBannerHome.color,
    variant: legacyWeekVariant(schedule, weekBannerHome),
  };
}

/**
 * Build API payload from a loaded engine context (no DB).
 * Resolution uses only resolveCustodyDateSync — no date/variant logic here.
 * @param {import('./custody-schedule-engine/types').CustodyResolveInput} engineCtx
 * @param {string} dateStr YYYY-MM-DD
 */
function buildCustodyContextFromEngine(engineCtx, dateStr) {
  const context = resolveCustodyDateSync(engineCtx, dateStr);

  if (!engineCtx.schedule || context.source === 'fallback' || !context.activeHome) {
    return { active: false };
  }

  const weekMonday = getWeekMondayIso(dateStr);
  const weekContext = resolveCustodyDateSync(engineCtx, weekMonday);

  return {
    active: true,
    // CustodyContext (public contract)
    date: context.date,
    activeHome: context.activeHome,
    source: context.source,
    patternType: context.patternType,
    activePeriod: context.activePeriod,
    nextTransition: context.nextTransition,
    previousTransition: context.previousTransition,
    isParentDay: context.isParentDay,
    // API envelope (not part of CustodyContext)
    weekMonday,
    parentHomeId: engineCtx.parentHomeId,
    // API legacy aliases — keep until clients stop reading week_variant aliases
    variant: legacyWeekVariant(engineCtx.schedule, context.activeHome),
    home: context.activeHome,
    weekBanner: legacyWeekBanner(weekContext.activeHome, engineCtx.schedule),
    isMyDay: context.isParentDay,
    nextHandoff: context.nextTransition ?? null,
    previousHandoff: context.previousTransition ?? null,
  };
}

/**
 * Build GET /custody/context response — CustodyContext + legacy aliases (one deploy).
 * @param {object} params
 * @param {string} params.childId
 * @param {string} params.familyId
 * @param {string} params.parentId
 * @param {string} params.dateStr YYYY-MM-DD
 * @param {import('pg').Pool|import('pg').PoolClient} [params.client]
 */
async function buildCustodyContextResponse({
  childId, familyId, parentId, dateStr, client,
}) {
  const engineCtx = await loadCustodyContext({ childId, familyId, parentId }, client);
  return buildCustodyContextFromEngine(engineCtx, dateStr);
}

/**
 * Count inclusive calendar days between YYYY-MM-DD strings (UTC noon math).
 * @param {string} dateFrom
 * @param {string} dateTo
 */
function inclusiveDayCount(dateFrom, dateTo) {
  const [y1, m1, d1] = dateFrom.split('-').map(Number);
  const [y2, m2, d2] = dateTo.split('-').map(Number);
  const start = Date.UTC(y1, m1 - 1, d1, 12, 0, 0);
  const end = Date.UTC(y2, m2 - 1, d2, 12, 0, 0);
  return Math.floor((end - start) / 86400000) + 1;
}

/**
 * Build GET /custody/context-range response — compact day list for preview UI.
 * @param {object} params
 * @param {string} params.childId
 * @param {string} params.familyId
 * @param {string} params.parentId
 * @param {string} params.dateFrom YYYY-MM-DD
 * @param {string} params.dateTo YYYY-MM-DD
 * @param {import('pg').Pool|import('pg').PoolClient} [params.client]
 */
async function buildCustodyContextRangeResponse({
  childId, familyId, parentId, dateFrom, dateTo, client,
}) {
  const spanDays = inclusiveDayCount(dateFrom, dateTo);
  if (spanDays < 1 || spanDays > CONTEXT_RANGE_MAX_DAYS) {
    return {
      ok: false,
      error: `Datumintervallet måste vara 1–${CONTEXT_RANGE_MAX_DAYS} dagar`,
    };
  }

  const engineCtx = await loadCustodyContext({ childId, familyId, parentId }, client);
  if (!engineCtx.schedule) {
    return { ok: true, active: false, days: [] };
  }

  const days = [];
  let d = dateFrom;
  while (d <= dateTo) {
    const payload = buildCustodyContextFromEngine(engineCtx, d);
    if (payload.active && payload.activeHome) {
      days.push({
        date: d,
        activeHome: payload.activeHome,
        source: payload.source,
        isParentDay: payload.isParentDay,
      });
    } else {
      days.push({ date: d, activeHome: null, source: 'fallback', isParentDay: false });
    }
    const [y, m, day] = d.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, day, 12, 0, 0));
    dt.setUTCDate(dt.getUTCDate() + 1);
    d = dt.toISOString().slice(0, 10);
  }

  return {
    ok: true,
    active: true,
    dateFrom,
    dateTo,
    weekMonday: getWeekMondayIso(dateFrom),
    days,
  };
}

module.exports = {
  CONTEXT_RANGE_MAX_DAYS,
  LEGACY_API_FIELDS,
  legacyWeekVariant,
  legacyWeekBanner,
  buildCustodyContextFromEngine,
  buildCustodyContextResponse,
  buildCustodyContextRangeResponse,
  inclusiveDayCount,
};
