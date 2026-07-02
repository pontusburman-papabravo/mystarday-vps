'use strict';

const { getWeekMondayIso } = require('./date-utils');
const {
  loadCustodyContext,
  resolveCustodyDateSync,
} = require('./custody-schedule-engine');

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

module.exports = {
  LEGACY_API_FIELDS,
  legacyWeekVariant,
  legacyWeekBanner,
  buildCustodyContextFromEngine,
  buildCustodyContextResponse,
};
